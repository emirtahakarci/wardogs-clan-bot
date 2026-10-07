# Wardogs Discord Botu

Discord botu, `@WARDOGS` X hesabındaki yeni paylaşımları sunucudaki `#haberler` kanalına aktarır.

## Ayarlar

`.env` içinde bot tokenı, uygulama kimliği ve X akışı için kanal kimliği bulunmalıdır:

```env
BOT_TOKEN=
CLIENT_ID=
DISCORD_GUILD_ID=
X_FEED_ENABLED=true
X_FEED_HANDLE=WARDOGS
X_FEED_CHANNEL_ID=
X_FEED_INTERVAL_MS=120000
X_FEED_SEND_EXISTING=false
```

Bot başlangıçta mevcut paylaşımı işaretler; yeni paylaşımlar periyodik olarak embed şeklinde gönderilir.
