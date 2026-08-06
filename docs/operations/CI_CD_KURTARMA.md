# İSTEBUL CI/CD Kurtarma Yönergesi

## Amaç

Bu yönerge, GitHub Actions kesintisi nedeniyle `main` dalındaki
birleştirmelerin CI ve Production Deploy çalışması oluşturmadığı durumlarda
uygulanır.

## Güvenlik ilkesi

Kurtarma sırası değiştirilemez:

1. GitHub Actions durumunu doğrula.
2. Güncel `origin/main` commitini belirle.
3. CI workflow'unu manuel çalıştır.
4. CI tamamen başarılı olmadan Production Deploy başlatma.
5. Production Deploy sonucunu ve hedef commit SHA'sını doğrula.

## Ön koşullar

- GitHub CLI oturumu açık olmalıdır.
- `ci.yml` ve `production-deploy.yml` dosyalarında `workflow_dispatch`
  tetikleyicisi bulunmalıdır.
- Komut repository kök dizininde çalıştırılmalıdır.
- Hedef dal varsayılan olarak `main` dalıdır.

## Kullanım

```bash
bash scripts/ci/github-actions-recovery.sh main
```

Betik yalnızca GitHub Actions bileşeni `operational` durumundaysa workflow
başlatır. GitHub Pages durumu ayrıca raporlanır. İSTEBUL Production Deploy
Cloudflare Pages kullandığı için GitHub Pages kesintisi tek başına kurtarma
işlemini engellemez.

## Çalışma sırası

Betik aşağıdaki işlemleri yapar:

1. GitHub durum API'sini `curl` ile kontrol eder.
2. `origin/main` referansını günceller.
3. Güncel hedef commit SHA'sını belirler.
4. CI workflow'unu `workflow_dispatch` ile başlatır.
5. CI sonucunu bekler ve başarısızsa Production Deploy'u başlatmaz.
6. CI başarılıysa Production Deploy workflow'unu başlatır.
7. Her iki çalışmanın hedef commit SHA'sını ve sonucunu raporlar.

## Başarı ölçütü

Aşağıdaki iki workflow aynı `origin/main` commitinde başarılı olmalıdır:

- CI
- Production Deploy

## Kesinti sırasında yapılmaması gerekenler

- Boş commit göndermek
- Kalite kapısı olmadan yeni PR birleştirmek
- Bekleyen veya başarısız deploy'u sürekli yeniden tetiklemek
- CI başarısızken Production Deploy çalıştırmak
- Secret değerlerini terminal çıktısında göstermek
- Kesintiyi repository kodu veya secret hatası sanarak gereksiz değişiklik yapmak

## Başarısızlık incelemesi

Betik bir workflow başarısız olduğunda çalışma özetini ve başarısız adım
loglarını terminalde gösterir. GitHub arayüzünden incelemek için rapordaki
çalışma adresi kullanılmalıdır.
