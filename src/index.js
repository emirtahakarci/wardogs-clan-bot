import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ActionRowBuilder,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  StringSelectMenuBuilder
} from 'discord.js';
import { commands, playerRoles } from './commands.js';
import { startXFeed } from './x-feed.js';

if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN .env içinde tanımlı değil.');
if (!process.env.CLIENT_ID) throw new Error('CLIENT_ID .env içinde tanımlı değil.');

const here = path.dirname(fileURLToPath(import.meta.url));
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function deployCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  const route = process.env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DISCORD_GUILD_ID)
    : Routes.applicationCommands(process.env.CLIENT_ID);
  await rest.put(route, { body: commands });
  console.log(`Komutlar ${process.env.DISCORD_GUILD_ID ? 'sunucudan' : 'global olarak'} temizlendi.`);
}

client.once('ready', async () => {
  console.log(`${client.user.tag} hazır.`);
  await deployCommands();
  await ensureRolePanel(client);
});

async function ensurePlayerRoles(guild) {
  await guild.roles.fetch();
  const roles = [];
  for (const definition of playerRoles) {
    let role = guild.roles.cache.find((item) => item.name === definition.name);
    if (!role) {
      role = await guild.roles.create({
        name: definition.name,
        color: definition.color,
        reason: 'WARDOGS oyuncu rolleri'
      });
    }
    roles.push({ ...definition, id: role.id });
  }
  return roles;
}

function buildRoleMenu(roles) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('wardogs-player-roles')
    .setPlaceholder('Oynadığın rolleri seç...')
    .setMinValues(0)
    .setMaxValues(roles.length)
    .addOptions(roles.map((role) => ({
      label: role.name,
      value: role.id,
      emoji: role.emoji,
      description: `${role.name} rolünü al veya kaldır`
    })));
  return new ActionRowBuilder().addComponents(menu);
}

async function ensureRolePanel(client) {
  if (!process.env.ROLE_CHANNEL_ID || !process.env.DISCORD_GUILD_ID) return;
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const roles = await ensurePlayerRoles(guild);
  const channel = await client.channels.fetch(process.env.ROLE_CHANNEL_ID);
  if (!channel?.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 50 });
  const panel = messages.find((message) => (
    message.author.id === client.user.id
    && message.components.some((row) => row.components.some((component) => component.customId === 'wardogs-player-roles'))
  ));
  const payload = {
    content: '🎮 **WARDOGS Oyuncu Rolleri**\nAşağıdaki menüden oynadığın görevleri seçebilirsin. Birden fazla rol seçebilir, daha sonra değiştirebilirsin.',
    components: [buildRoleMenu(roles)]
  };
  if (panel) await panel.edit(payload);
  else await channel.send(payload);
}

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'roller') {
    const roles = await ensurePlayerRoles(interaction.guild);

    await interaction.reply({
      content: `Rol seçim paneli hazırlandı. Rolleri ${process.env.ROLE_CHANNEL_ID ? `<#${process.env.ROLE_CHANNEL_ID}>` : 'rol kanalındaki menüden'} seçebilirsin. ${roles.length} rol mevcut.`,
      ephemeral: true
    });
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'wardogs-player-roles') {
    await interaction.guild.roles.fetch();
    const managedRoleIds = new Set(
      playerRoles
        .map((definition) => interaction.guild.roles.cache.find((role) => role.name === definition.name)?.id)
        .filter(Boolean)
    );
    const selectedRoleIds = new Set(interaction.values);
    const memberRolesToRemove = interaction.member.roles.cache.filter((role) => managedRoleIds.has(role.id));
    if (memberRolesToRemove.size) await interaction.member.roles.remove(memberRolesToRemove);
    if (selectedRoleIds.size) await interaction.member.roles.add([...selectedRoleIds]);

    const selected = playerRoles
      .filter((definition) => selectedRoleIds.has(
        interaction.guild.roles.cache.find((role) => role.name === definition.name)?.id
      ))
      .map((definition) => `${definition.emoji} ${definition.name}`);
    await interaction.update({
      content: selected.length
        ? `Rollerin güncellendi: ${selected.join(', ')}`
        : 'WARDOGS oyuncu rollerin kaldırıldı.',
      components: interaction.message.components
    });
  }
});

await client.login(process.env.BOT_TOKEN);

if (process.env.X_FEED_ENABLED === 'true' && process.env.X_FEED_CHANNEL_ID) {
  const xStateFile = path.resolve(here, '..', process.env.X_FEED_STATE_FILE ?? './data/x-feed.json');
  startXFeed({
    client,
    channelId: process.env.X_FEED_CHANNEL_ID,
    trChannelId: process.env.X_FEED_TR_CHANNEL_ID,
    handle: process.env.X_FEED_HANDLE ?? 'WARDOGS',
    stateFile: xStateFile,
    intervalMs: Number(process.env.X_FEED_INTERVAL_MS) || 120000,
    sendExisting: process.env.X_FEED_SEND_EXISTING === 'true'
  });
}
