import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('roller')
    .setDescription('WARDOGS oyun rollerini seçme menüsünü açar.')
    .toJSON()
];

export const playerRoles = [
  { name: 'Piyade', emoji: '🪖', color: 0x5865f2 },
  { name: 'Tankçı', emoji: '🛡️', color: 0x57f287 },
  { name: 'Pilot', emoji: '✈️', color: 0xfee75c },
  { name: 'Komutan', emoji: '🎖️', color: 0xeb459e },
  { name: 'İnşaatçı', emoji: '🔧', color: 0xed4245 }
];
