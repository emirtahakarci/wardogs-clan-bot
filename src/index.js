import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, EmbedBuilder,
  GatewayIntentBits, PermissionFlagsBits, REST, Routes
} from 'discord.js';
import { commands } from './commands.js';
import { createStore } from './db.js';
import { startXFeed } from './x-feed.js';

const required = ['BOT_TOKEN', 'CLIENT_ID'];
for (const key of required) if (!process.env[key]) throw new Error(`${key} .env içinde tanımlı değil.`);

const here = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.resolve(here, '..', process.env.DATA_FILE ?? './data/clans.json');
const store = createStore(dataFile);
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const parentCategoryId = process.env.CLAN_PARENT_CATEGORY_ID || undefined;

const text = (value) => String(value ?? '').trim();
const norm = (value) => text(value).toLocaleLowerCase('tr-TR');
const clanForUser = (id) => store.all().find((clan) => clan.ownerId === id || clan.memberIds.includes(id));
const clanByTag = (tag) => store.all().find((clan) => norm(clan.tag) === norm(tag));
const safeChannelName = (value) => text(value).toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'klan';
const botPerms = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak];

function buttons(clanId, userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`clan_accept:${clanId}:${userId}`).setLabel('Kabul Et').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`clan_reject:${clanId}:${userId}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
  );
}

async function deployCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  const route = process.env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DISCORD_GUILD_ID)
    : Routes.applicationCommands(process.env.CLIENT_ID);
  await rest.put(route, { body: commands });
  console.log(`Komutlar ${process.env.DISCORD_GUILD_ID ? 'sunucuya' : 'global olarak'} kaydedildi.`);
}

async function getLeaderRole(guild) {
  let role = guild.roles.cache.find((r) => r.name === 'Klan Lideri');
  if (!role) role = await guild.roles.create({ name: 'Klan Lideri', reason: 'Wardogs klan lideri rolü' });
  return role;
}

async function createClan(guild, owner, name, tag, description) {
  if (!/^[a-z0-9]{2,4}$/i.test(tag)) throw new Error('Etiket yalnızca 2-4 İngilizce harf/rakam içermeli.');
  if (clanForUser(owner.id)) throw new Error('Zaten bir klana üyesin veya lidersin.');
  if (clanByTag(tag)) throw new Error('Bu klan etiketi zaten kullanılıyor.');
  const me = await guild.members.fetchMe();
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels) || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error('Botta Manage Channels ve Manage Roles izinleri bulunmalı.');
  }
  const role = await guild.roles.create({ name: `🏴 ${tag.toUpperCase()} | ${text(name)}`.slice(0, 100), reason: 'Yeni Wardogs klanı' });
  let textChannel; let voiceChannel;
  try {
    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
      { id: me.id, allow: botPerms },
      { id: owner.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageChannels] }
    ];
    const base = { parent: parentCategoryId, permissionOverwrites: overwrites, reason: `Klan kanalları: ${tag}` };
    textChannel = await guild.channels.create({ name: `💬-${safeChannelName(tag)}-sohbet`, type: ChannelType.GuildText, ...base });
    voiceChannel = await guild.channels.create({ name: `🔊 ${tag.toUpperCase()} Ses`, type: ChannelType.GuildVoice, ...base });
    const leaderRole = await getLeaderRole(guild);
    await owner.roles.add([role, leaderRole], 'Klan oluşturucusu ve lideri');
    const clan = { id: `${Date.now()}-${owner.id}`, name: text(name), tag: tag.toUpperCase(), description: text(description), ownerId: owner.id, roleId: role.id, textChannelId: textChannel.id, voiceChannelId: voiceChannel.id, memberIds: [owner.id], applications: [], createdAt: new Date().toISOString() };
    await store.add(clan);
    await textChannel.send({ embeds: [new EmbedBuilder().setTitle(`🏴 ${clan.tag} | ${clan.name}`).setDescription(`${clan.description}\n\nLider: <@${owner.id}>`).setColor(0xe3a008)] });
    return clan;
  } catch (error) {
    if (voiceChannel) await voiceChannel.delete('Klan oluşturma geri alındı').catch(() => {});
    if (textChannel) await textChannel.delete('Klan oluşturma geri alındı').catch(() => {});
    await role.delete('Klan oluşturma geri alındı').catch(() => {});
    throw error;
  }
}

async function notifyLeader(guild, clan, applicant, message) {
  const leader = await guild.members.fetch(clan.ownerId).catch(() => null);
  const embed = new EmbedBuilder().setTitle(`Yeni klan başvurusu: ${clan.tag}`).setDescription(`<@${applicant.id}> klanına katılmak istiyor.\n\nMesaj: ${message || 'Mesaj yok.'}`).setColor(0x4f7cff);
  const row = buttons(clan.id, applicant.id);
  if (leader) await leader.send({ embeds: [embed], components: [row] }).catch(() => {});
  const channel = await guild.channels.fetch(clan.textChannelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ content: `<@${clan.ownerId}>`, embeds: [embed], components: [row] });
}

async function applyToClan(interaction, clan, message) {
  if (clanForUser(interaction.user.id)) throw new Error('Zaten bir klana üyesin veya lidersin.');
  if (clan.applications.some((a) => a.userId === interaction.user.id)) throw new Error('Bu klana zaten bekleyen başvurun var.');
  clan.applications.push({ userId: interaction.user.id, message: text(message), createdAt: new Date().toISOString() });
  await store.save();
  await notifyLeader(interaction.guild, clan, interaction.user, text(message));
}

function clanEmbed(clan) {
  return new EmbedBuilder().setTitle(`🏴 ${clan.tag} | ${clan.name}`).setDescription(clan.description).addFields({ name: 'Lider', value: `<@${clan.ownerId}>`, inline: true }, { name: 'Üye', value: String(clan.memberIds.length), inline: true });
}

client.once('ready', async () => { console.log(`${client.user.tag} hazır.`); await deployCommands(); });
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'klan-olustur') {
        await interaction.deferReply({ ephemeral: true });
        const clan = await createClan(interaction.guild, interaction.member, interaction.options.getString('ad'), interaction.options.getString('etiket'), interaction.options.getString('aciklama'));
        return interaction.editReply(`Klan oluşturuldu: **${clan.tag} | ${clan.name}**. Özel kanallar hazır, lider rolün verildi.`);
      }
      if (interaction.commandName === 'klan-ara') {
        const filter = norm(interaction.options.getString('arama'));
        const clans = store.all().filter((c) => !filter || norm(`${c.name} ${c.tag} ${c.description}`).includes(filter)).slice(0, 10);
        if (!clans.length) return interaction.reply({ content: 'Eşleşen klan bulunamadı.', ephemeral: true });
        const rows = clans.map((c) => new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`clan_apply:${c.id}`).setLabel(`${c.tag} başvurusu`).setStyle(ButtonStyle.Primary)));
        return interaction.reply({ embeds: clans.map(clanEmbed), components: rows, ephemeral: true });
      }
      if (interaction.commandName === 'klanim') {
        const clan = clanForUser(interaction.user.id);
        if (!clan) return interaction.reply({ content: 'Henüz bir klana bağlı değilsin.', ephemeral: true });
        const pending = clan.ownerId === interaction.user.id ? `\nBekleyen başvuru: ${clan.applications.length}` : '';
        return interaction.reply({ embeds: [clanEmbed(clan).setFooter({ text: `Metin kanalı: #${clan.textChannelId}${pending}` })], ephemeral: true });
      }
      if (interaction.commandName === 'klan-basvur') {
        const clan = clanByTag(interaction.options.getString('etiket'));
        if (!clan) return interaction.reply({ content: 'Bu etiketle bir klan yok.', ephemeral: true });
        await applyToClan(interaction, clan, interaction.options.getString('mesaj'));
        return interaction.reply({ content: `Başvurun **${clan.tag} | ${clan.name}** liderine gönderildi.`, ephemeral: true });
      }
      if (interaction.commandName === 'klan-basvurular') {
        const clan = store.all().find((c) => c.ownerId === interaction.user.id);
        if (!clan) return interaction.reply({ content: 'Bu komut yalnızca klan liderleri içindir.', ephemeral: true });
        if (!clan.applications.length) return interaction.reply({ content: 'Bekleyen başvuru yok.', ephemeral: true });
        const embeds = clan.applications.map((a) => new EmbedBuilder().setDescription(`<@${a.userId}> — ${a.message || 'Mesaj yok.'}`).setFooter({ text: new Date(a.createdAt).toLocaleString('tr-TR') }));
        return interaction.reply({ embeds, components: clan.applications.map((a) => buttons(clan.id, a.userId)), ephemeral: true });
      }
    }
    if (interaction.isButton()) {
      const [action, clanId, userId] = interaction.customId.split(':');
      const clan = store.all().find((c) => c.id === clanId);
      if (!clan) return interaction.reply({ content: 'Klan kaydı bulunamadı.', ephemeral: true });
      if (action === 'clan_apply') {
        if (clanForUser(interaction.user.id)) return interaction.reply({ content: 'Zaten bir klana üyesin veya lidersin.', ephemeral: true });
        return interaction.reply({ content: `Başvuruyu göndermek için /klan-basvur etiket:${clan.tag} kullanabilirsin.`, ephemeral: true });
      }
      if (interaction.user.id !== clan.ownerId) return interaction.reply({ content: 'Bu başvuruyu yalnızca klan lideri yönetebilir.', ephemeral: true });
      const application = clan.applications.find((a) => a.userId === userId);
      if (!application) return interaction.reply({ content: 'Bu başvuru zaten sonuçlandırılmış.', ephemeral: true });
      if (action === 'clan_accept') {
        if (clanForUser(userId)) throw new Error('Başvuran artık başka bir klana bağlı.');
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.add(clan.roleId, 'Klan başvurusu kabul edildi');
        clan.memberIds.push(userId); clan.applications = clan.applications.filter((a) => a.userId !== userId); await store.save();
        await member.send(`**${clan.tag} | ${clan.name}** klanına kabul edildin.`).catch(() => {});
        return interaction.update({ content: `✅ <@${userId}> klana kabul edildi.`, embeds: [], components: [] });
      }
      if (action === 'clan_reject') {
        clan.applications = clan.applications.filter((a) => a.userId !== userId); await store.save();
        const member = await interaction.guild.members.fetch(userId).catch(() => null); await member?.send(`**${clan.tag} | ${clan.name}** başvurun reddedildi.`).catch(() => {});
        return interaction.update({ content: `❌ <@${userId}> başvurusu reddedildi.`, embeds: [], components: [] });
      }
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    if (interaction.replied || interaction.deferred) await interaction.editReply({ content: `İşlem başarısız: ${message}`, embeds: [], components: [] }).catch(() => {});
    else await interaction.reply({ content: `İşlem başarısız: ${message}`, ephemeral: true }).catch(() => {});
  }
});

await store.load();
await client.login(process.env.BOT_TOKEN);

if (process.env.X_FEED_ENABLED === 'true' && process.env.X_FEED_CHANNEL_ID) {
  const xStateFile = path.resolve(here, '..', process.env.X_FEED_STATE_FILE ?? './data/x-feed.json');
  startXFeed({
    client,
    channelId: process.env.X_FEED_CHANNEL_ID,
    handle: process.env.X_FEED_HANDLE ?? 'WARDOGS',
    stateFile: xStateFile,
    intervalMs: Number(process.env.X_FEED_INTERVAL_MS) || 120000,
    sendExisting: process.env.X_FEED_SEND_EXISTING === 'true'
  });
}
