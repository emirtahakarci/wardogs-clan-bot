import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE = 'https://api.fxtwitter.com/2/profile';

function asText(value) {
  return String(value ?? '').trim();
}

async function readState(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return { lastTimestamp: Number(parsed.lastTimestamp) || 0, lastId: asText(parsed.lastId) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { lastTimestamp: 0, lastId: '' };
  }
}

async function writeState(filePath, state) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(tempPath, filePath);
}

async function fetchStatuses(handle, since = 0) {
  const params = new URLSearchParams({ count: '20', groupthreads: '1' });
  if (since > 0) params.set('since', String(Math.floor(since)));
  const response = await fetch(`${API_BASE}/${encodeURIComponent(handle)}/statuses?${params}`);
  if (response.status === 204) return [];
  if (!response.ok) throw new Error(`X akışı ${response.status} döndürdü.`);
  const payload = await response.json();
  return Array.isArray(payload.results) ? payload.results.filter((item) => item?.type === 'status') : [];
}

function postUrl(post) {
  return asText(post.url) || `https://x.com/${post.author?.screen_name || 'WARDOGS'}/status/${post.id}`;
}

function mediaUrl(post) {
  return asText(post.media?.photos?.[0]?.url) || asText(post.media?.videos?.[0]?.thumbnail_url);
}

export function startXFeed({ client, channelId, handle = 'WARDOGS', stateFile, intervalMs = 120000, sendExisting = false }) {
  let running = false;

  const poll = async () => {
    if (running) return;
    running = true;
    try {
      const state = await readState(stateFile);
      const posts = (await fetchStatuses(handle, state.lastTimestamp))
        .sort((a, b) => Number(a.created_timestamp || 0) - Number(b.created_timestamp || 0));

      if (!posts.length) return;

      const newest = posts[posts.length - 1];
      if (!state.lastTimestamp && !sendExisting) {
        await writeState(stateFile, { lastTimestamp: Number(newest.created_timestamp) || 0, lastId: asText(newest.id) });
        console.log(`X akışı hazırlandı: @${handle} için mevcut paylaşımlar atlandı.`);
        return;
      }

      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) throw new Error(`X kanalı bulunamadı veya metin kanalı değil: ${channelId}`);

      for (const post of posts) {
        const embed = {
          color: 0x1d9bf0,
          author: { name: `@${post.author?.screen_name || handle}`, url: `https://x.com/${post.author?.screen_name || handle}` },
          description: asText(post.text).slice(0, 4096) || 'Yeni paylaşım',
          url: postUrl(post),
          timestamp: post.created_at ? new Date(post.created_at).toISOString() : undefined,
          footer: { text: 'WARDOGS • X' }
        };
        const image = mediaUrl(post);
        if (image) embed.image = { url: image };
        await channel.send({ embeds: [embed] });
      }

      await writeState(stateFile, { lastTimestamp: Number(newest.created_timestamp) || 0, lastId: asText(newest.id) });
      console.log(`X akışından ${posts.length} yeni paylaşım gönderildi.`);
    } catch (error) {
      console.error('X akışı hatası:', error);
    } finally {
      running = false;
    }
  };

  void poll();
  return setInterval(poll, intervalMs);
}
