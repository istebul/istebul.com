# UX önizlemesi — nasıl açılır?

## Yöntem 1 (en kolay): `npm run preview:ux`

1. Terminalde **proje klasörüne** gidin (`istebul.com` / repo kökü).
2. Çalıştırın:

```bash
npm run preview:ux
```

3. Çıkan adresi tarayıcıya yapıştırın (genelde):

**http://127.0.0.1:9876/**

4. Sayfa açılmazsa terminalde `Ctrl+C` ile durdurun; port doluysa:

```bash
PREVIEW_PORT=9877 npm run preview:ux
```

---

## Yöntem 2: Dosyayı doğrudan aç (sunucu yok)

Dosyayı çift tıklayın veya sürükleyip tarayıcıya bırakın:

- **Windows:** `docs\previews\onay-oncesi-ux-preview.html`
- **Mac/Linux:** `docs/previews/onay-oncesi-ux-preview.html`

Adres çubuğunda `file:///...` görünür — bu normaldir.

---

## Yöntem 3: Cursor / VS Code

1. `docs/previews/onay-oncesi-ux-preview.html` dosyasını açın.
2. Sağ tık → **Open with Live Server** (eklenti varsa)  
   veya dosyaya sağ tık → **Reveal in Finder/Explorer** → çift tık.

---

## Kontrol listesi (açılmıyorsa)

| Sorun | Çözüm |
|--------|--------|
| `npm run preview:ux` yok | `git pull` — script `main`’de olmalı |
| Boş sayfa / bağlantı reddedildi | Terminalde sunucu çalışıyor mu? `npm run preview:ux` açık kalsın |
| Port meşgul | `PREVIEW_PORT=9877 npm run preview:ux` |
| Yanlış klasör | `package.json` olan dizinde olun |
| Sadece canlı siteyi denediniz | Önizleme **www.istebul.com’da değil** — yerel veya `file://` |

---

## Onay

İnceledikten sonra chat’te: **Son tur OK** veya **Hepsi OK, uygula**
