# Compliance Runbook — KVKK / GDPR Talepleri

**Audit:** `docs/COMPLIANCE_READINESS_AUDIT.md`  
**Not legal advice.**

---

## 1. Talep türleri

| Tür | SLA (hedef) | Sahip |
|-----|-------------|-------|
| Bilgi / erişim | 30 gün | Ops + Eng |
| Düzeltme | 30 gün | Ops |
| Silme / unutulma | 30 gün | Ops + Eng |
| İtiraz (pazarlama) | 7 gün | Ops |
| Taşınabilirlik | 30 gün | Eng |
| Veri ihlali | 72 saat (KVKK/GDPR) | Founder + counsel |

**Başvuru kanalı:** İletişim formu / `iletisim.html` — konu satırı: `KVKK Başvurusu`

---

## 2. Kimlik doğrulama

1. Başvurunun kayıtlı e-posta / telefondan geldiğini doğrula.
2. Şüpheli ise ek doğrulama (son lead tarihi, son 4 hane telefon).
3. Üçüncü taraf talebi → resmi vekalet veya red.

---

## 3. Silme checklist (hesap + lead)

- [ ] Stripe: abonelik iptal / customer notu
- [ ] Supabase Auth: kullanıcı sil (Dashboard veya Admin API)
- [ ] `profiles`: sil veya anonimleştir
- [ ] `auto_leads`: `email`, `phone`, `contact_name` → NULL; `notes` → "anonymized {date}"
- [ ] `analytics_events`: ilgili `user_id` / `email` satırları sil veya anonimleştir
- [ ] `lifecycle_contacts`: `unsubscribed_at` + cancel enrollments
- [ ] `operational_events`: PII property temizle (varsa)
- [ ] Sentry: kullanıcı silme talebi (vendor panel)
- [ ] Yanıt e-postası: işlem tamamlandı

---

## 4. Erişim / export checklist

- [ ] `profiles` row
- [ ] `subscriptions` row
- [ ] `auto_leads` where email/phone match
- [ ] Son 90 gün `analytics_events` (email varsa)
- [ ] JSON veya PDF olarak güvenli kanaldan ilet (şifreli zip)

---

## 5. Pazarlama opt-out

| Kanal | Adım |
|-------|------|
| Lifecycle email | `lifecycle-enroll` unsubscribe veya DB `unsubscribed_at` |
| Newsletter | localStorage listesinden çıkar; ESP varsa listeden sil |
| Analytics | Zaten cookie decline |

---

## 6. Veri ihlali (taslak)

1. Tespit → Eng lead + founder
2. Etki analizi (hangi veri, kaç kişi)
3. **72 saat** içinde Kurul / GDPR supervisory authority (counsel)
4. Etkilenen kullanıcılara bildirim (yüksek risk ise)
5. Olay kaydı: `operational_events` + internal doc
6. Düzeltici aksiyon

---

## 7. Retention job (planlanan)

Haftalık review:

- `data/compliance/retention-schedule.json` ile karşılaştır
- Spam/test lead temizliği
- 90 gün+ `operational_events` arşiv/sil

---

## 8. Partner lead paylaşımı

Lead gönderildiğinde partner **veri sorumlusu / işleyen** rolü sözleşmede tanımlı olmalı. Silme talebi partner’a iletilmeli (iş ortaklığı sözleşmesi).
