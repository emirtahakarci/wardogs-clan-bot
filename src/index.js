import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { commands } from './commands.js';
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
