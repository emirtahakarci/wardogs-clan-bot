import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('klan-olustur')
    .setDescription('Ad, etiket ve açıklama ile yeni bir klan oluşturur.')
    .addStringOption((o) => o.setName('ad').setDescription('Klan adı').setRequired(true).setMaxLength(60))
    .addStringOption((o) => o.setName('etiket').setDescription('2-4 karakter, örn. WDG').setRequired(true).setMinLength(2).setMaxLength(4))
    .addStringOption((o) => o.setName('aciklama').setDescription('Kısa klan açıklaması').setRequired(true).setMaxLength(500)),
  new SlashCommandBuilder()
    .setName('klan-ara')
    .setDescription('Katılım başvurusu açık klanları listeler.')
    .addStringOption((o) => o.setName('arama').setDescription('Ad veya etiket filtresi').setRequired(false).setMaxLength(60)),
  new SlashCommandBuilder().setName('klanim').setDescription('Kendi klanını ve başvurularını gösterir.'),
  new SlashCommandBuilder()
    .setName('klan-basvur')
    .setDescription('Etiketini bildiğin klana katılım başvurusu gönderir.')
    .addStringOption((o) => o.setName('etiket').setDescription('Klan etiketi').setRequired(true).setMinLength(2).setMaxLength(4))
    .addStringOption((o) => o.setName('mesaj').setDescription('Lidere iletilecek kısa mesaj').setRequired(false).setMaxLength(300)),
  new SlashCommandBuilder().setName('klan-basvurular').setDescription('Klan lideri olarak bekleyen başvuruları gösterir.')
].map((command) => command.toJSON());
