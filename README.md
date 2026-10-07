# Wardogs Klan Botu

Discord.js v14 ile hazırlanmış özel klan botu. Kullanıcılar klan kurabilir, klan arayabilir ve katılım başvurusu gönderebilir; lider başvuruyu kabul veya reddeder.

## Komutlar

- `/klan-olustur`: Klan adı, 2–4 karakterlik etiket ve açıklama alır. Oluşturucuya klan rolü ile `Klan Lideri` rolü verilir ve özel metin/ses kanalları açılır.
- `/klan-ara`: Klanları listeler.
- `/klan-basvur`: Etikete göre başvuru gönderir. Başvuru lidere DM ve klan kanalındaki yönetim mesajı olarak iletilir.
- `/klan-basvurular`: Liderin bekleyen başvuruları kabul/reddetmesini sağlar.
- `/klanim`: Kullanıcının klanını ve lider için bekleyen başvuru sayısını gösterir.

Discord komut adlarında Türkçe karakter kullanılamadığı için kullanıcı isteğindeki `/klan-oluştur` yerine geçerli ASCII komutu `/klan-olustur` olarak tanımlandı.

## Kurulum

1. Node.js 20 veya üzerini kurun.
2. Discord Developer Portal'da bir bot uygulaması oluşturun.
3. `.env.example` dosyasını `.env` olarak kopyalayın ve `BOT_TOKEN` ile `CLIENT_ID` değerlerini doldurun. Token'ı bu projeye veya Git'e koymayın.
4. Test sunucusunun ID'sini `DISCORD_GUILD_ID` olarak yazın. Bu alan doluysa komutlar anında o sunucuya yüklenir; boşsa global komutlar olarak yayınlanır ve görünmesi daha uzun sürebilir.
5. İsterseniz mevcut `⚔️ Wardogs Klanlar` kategorisinin ID'sini `CLAN_PARENT_CATEGORY_ID` olarak yazın. Boş bırakılırsa kanallar sunucu kökünde oluşturulur.
6. Çalıştırın:

```bash
npm install
npm run check
npm start
```

Uygulama ID'si: `1557287251677937745`

Sınırlı izinli davet bağlantısı: [Wardogs Klan Botu’nu sunucuya ekle](https://discord.com/oauth2/authorize?client_id=1557287251677937745&permissions=271666192&scope=bot%20applications.commands)

Bu bağlantı `Administrator` içermez. Davet sonrası bot rolünü `Klan Lideri` rolünün üstünde tutun; botun oluşturduğu klan rollerinin altında kalması normaldir.

İlk çalıştırmada `data/clans.json` oluşur. Bu dosya klan kayıtlarını tutar; gizli bilgi içermez.

## Bot izinleri

Bot rolüne yalnızca şu izinler gerekir: View Channels, Send Messages, Embed Links, Read Message History, Manage Channels, Manage Roles, Connect ve Speak. `Administrator` kullanılmaz. Bot rolü, `Klan Lideri` gibi botun atayacağı mevcut rollerin üstünde olmalıdır. Discord Developer Portal'da Server Members Intent'i açın.

Kovu'nun rol, kanal veya ayarlarına dokunulmaz. Bu bot yalnızca kendi oluşturduğu klan rollerini ve kanallarını yönetir.

## Koyeb / Render ücretsiz barındırma notu

Ücretsiz planlar bot için garanti edilen 7/24 çalışma ortamı değildir. Render'ın ücretsiz servisleri boş kaldığında uykuya geçebilir; Koyeb'de ücretsiz kaynak, kullanım kotası, bölge ve uygunluk sınırları bulunabilir. Bu koşullar ve fiyatlandırmalar değişebileceği için deploy etmeden önce sağlayıcının güncel belgelerini kontrol edin.

Bu proje JSON dosyasına yazar. Ücretsiz/ephemeral dosya sistemi olan ortamlarda yeniden deploy, yeniden başlatma veya servis taşınması bu dosyayı kaybettirebilir. Gerçek kullanımda kalıcı disk veya PostgreSQL gibi harici kalıcı veri deposu kullanın. Bot token'ını yalnızca sağlayıcının gizli environment variable alanında saklayın.

## Sınırlar ve güvenlik

- Her kullanıcı aynı anda yalnızca bir klana ait olabilir.
- Lider yalnızca kendi klanının başvurularını yönetebilir.
- Klan kanallarında `@everyone` için görüntüleme kapalıdır; klan rolü ve lider için erişim açılır.
- İstek üzerine klan silme/transfer komutu eklenmedi; yanlış kayıtları yönetici panelinden veya veri yedeğinden kontrollü şekilde ele alın.
