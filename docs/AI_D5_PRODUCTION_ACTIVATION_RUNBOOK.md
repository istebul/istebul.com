# AI-D5 Production OpenAI Activation Runbook

> **DURUM:** Bu runbook uygulanabilir bir operasyon rehberidir.
> **Production aktivasyonu manuel onay gerektirir.**
> Legal/compliance sign-off tamamlanmadan Production OpenAI için **GO verilmez.**
> Kod deploy gerekmez; yalnızca Cloudflare Pages **Production** env değişikliği.

**Canonical referanslar:**

- [`docs/AI_PROVIDER.md`](AI_PROVIDER.md) — env tablosu, provider davranışı, cache
- [`docs/RESILIENCE_RUNBOOK.md`](RESILIENCE_RUNBOOK.md) §6 — outage triage
- [`docs/DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) — checklist + sign-off
- [`docs/investor/SUBPROCESSORS.md`](investor/SUBPROCESSORS.md) — conditional OpenAI subprocessor

**Runtime (referans, değiştirilmez):** `functions/ai-proxy.js`, `functions/_shared/ai/provider-registry.js`

**Önemli kurallar:**

- Provider’lar arasında **otomatik fallback yoktur** (`AI_PROVIDER=openai` iken Groq devreye girmez).
- Rollback **kod rollback gerektirmez** — yalnızca env değişikliği.
- Production rollback için **`GROQ_API_KEY` korunmalıdır**.
- AI commentary yalnızca narration sağlar; **skor ve karar kural motorunu değiştirmez**.

---

## 0. Manuel Onay Kapısı

Production `AI_PROVIDER=openai` flip’i yalnızca aşağıdaki rollerin imzasıyla yapılır:

| Rol | Onay kriteri | Onay (✓) | İsim | Tarih |
|-----|--------------|----------|------|-------|
| **Engineering** | Preview smoke PASS; runtime provider-aware wiring doğrulandı | | | |
| **Ops** | Env sırası anlaşıldı; rollback planı hazır; log erişimi var | | | |
| **Product** | `/auto/` UX ve commentary kalitesi kabul edildi | | | |
| **Legal** | SUBPROCESSORS; kvkk/gizlilik; SCC/TIA; formal DPA | | | |

**Legal sign-off yoksa → STOP (Production OpenAI NO-GO).**

**Aktivasyonu yapan operatör:** _______________  
**Smoke doğrulayan:** _______________  
**Aktivasyon zamanı (UTC+3):** _______________

---

## 1. Pre-Flight Checklist

### Repo / runtime

- [ ] `main` HEAD deploy edilmiş (kod değişikliği gerekmez)
- [ ] Provider-aware `/ai-proxy` wiring doğrulandı
- [ ] Provider fallback olmadığı biliniyor

### Preview (tamamlanmış olmalı — AI-D5 readiness)

- [x] OpenAI Preview smoke PASS
- [x] Structured JSON smoke PASS
- [x] `/auto/` browser akışı PASS
- [x] Groq rollback PASS
- [x] Preview güvenli durumda (`AI_PROVIDER` unset veya `groq`)

### Compliance (Legal onayı zorunlu)

- [ ] `docs/investor/SUBPROCESSORS.md` OpenAI conditional incelendi
- [ ] `kvkk.html` / `gizlilik.html` OpenAI aktivasyonu için Legal tarafından güncellendi
- [ ] Formal subprocessor schedule / DPA (Legal)
- [ ] SCC / Transfer Impact Assessment (Groq + OpenAI) tamamlandı
- [ ] `docs/COMPLIANCE_READINESS_AUDIT.md` gap’leri kapatıldı veya Legal kabul etti

### Production env hazırlığı (henüz flip yapma)

- [ ] Cloudflare Dashboard → **Production** scope seçili (Preview değil)
- [ ] `GROQ_API_KEY` Production’da mevcut ve geçerli (rollback için)
- [ ] `<OPENAI_API_KEY>` Production’a encrypted eklenecek (değer repo’ya yazılmaz)
- [ ] `OPENAI_MODEL` unset veya `gpt-4o-mini` kararı alındı
- [ ] `AI_PROXY_TOKEN` durumu biliniyor (var / yok)
- [ ] Aktivasyon penceresi ve on-call kişi belirlendi

---

## 2. Production Env Değişiklik Sırası

**Yol:** Cloudflare → Workers & Pages → **istebul-com** → Settings → Environment variables → **Production**

| Sıra | Değişken | Eylem |
|------|----------|-------|
| 0 | `GROQ_API_KEY` | **Dokunma** — rollback için korunmalı |
| 1 | `OPENAI_API_KEY` | Encrypted secret ekle (`<OPENAI_API_KEY>`) |
| 2 | `OPENAI_MODEL` | Opsiyonel; unset → runtime default `gpt-4o-mini` |
| — | *Bekle* | Env reload / propagation (≈1–3 dk) |
| 3 | `AI_PROVIDER` | **En son:** `openai` set et |

**Yasak sıra:** `AI_PROVIDER=openai` key’lerden önce → `500 OPENAI_API_KEY missing` + client rule-based fallback.

---

## 3. AI_PROVIDER=openai Öncesi Zorunlu Kontroller

Flip’ten hemen önce Production scope’ta doğrula:

- [ ] `OPENAI_API_KEY` satırı mevcut (encrypted)
- [ ] `GROQ_API_KEY` hâlâ mevcut
- [ ] `AI_PROVIDER` henüz `openai` **değil** (unset veya `groq`)
- [ ] Preview scope güvenli (`AI_PROVIDER` openai değil)
- [ ] §0 Legal sign-off tablosu tamam
- [ ] İki kişi kuralı: env değiştiren ≠ smoke doğrulayan (önerilir)

---

## 4. Production Live Smoke — Basit Prompt

```bash
curl -sS -w "\nHTTP:%{http_code}\n" -X POST "<PRODUCTION_URL>/ai-proxy" \
  -H "Content-Type: application/json" \
  -H "Origin: <ORIGIN>" \
  -d '{"prompt":"Production OpenAI smoke — tek cümle Türkçe yanıt ver."}'
```

**Placeholder örnekleri (referans, secret değil):**

- `<PRODUCTION_URL>` → `https://www.istebul.com`
- `<ORIGIN>` → `https://www.istebul.com`

**Beklenen:** HTTP `200` + `{"result":"..."}`

### AI_PROXY_TOKEN varsa (token’lı test)

```bash
curl -sS -w "\nHTTP:%{http_code}\n" -X POST "<PRODUCTION_URL>/ai-proxy" \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.example" \
  -H "x-ai-proxy-token: <AI_PROXY_TOKEN>" \
  -d '{"prompt":"Token auth production smoke."}'
```

**Beklenen:** HTTP `200` (geçersiz origin + geçerli token)

---

## 5. Structured JSON Smoke

```bash
curl -sS -w "\nHTTP:%{http_code}\n" -X POST "<PRODUCTION_URL>/ai-proxy" \
  -H "Content-Type: application/json" \
  -H "Origin: <ORIGIN>" \
  -d '{
    "prompt": "Otomotiv karar bağlamı için yalnızca geçerli JSON döndür: {\"executive_summary\":\"...\",\"key_factors\":[\"...\"],\"risks\":[\"...\"],\"recommendation\":\"...\"}",
    "format": "structured_commentary"
  }'
```

**Beklenen:** HTTP `200`; `result` alanı parse edilebilir JSON string.

**FAIL ise:** STOP → §10 Rollback.

---

## 6. /auto/ Browser Doğrulama

1. `<PRODUCTION_URL>/auto/` aç (ör. `https://www.istebul.com/auto/`)
2. Wizard’ı tamamla → sonuç ekranı
3. DevTools → Network → `POST /ai-proxy` filtrele
4. **Beklenen:** HTTP `200`, body `{"result":"..."}`
5. AI commentary / synthesis alanı görünür (sürekli rule-based fallback değil)
6. Sürekli fallback → STOP → §10 Rollback + Functions log triage

**Not:** Skor ve fiyat kural motorundan gelir; AI yalnızca narration sağlar.

---

## 7. Cloudflare Functions Log İzleme

**Yol:** Cloudflare Dashboard → Pages → **istebul-com** → Logs / Functions

| Pattern | Anlam | Aksiyon |
|---------|-------|---------|
| `OPENAI_API_KEY missing` | Key eksik veya env reload tamamlanmamış | Flip geri al; key kontrol |
| `OpenAI request failed` | Upstream hata (auth, quota, model) | OpenAI dashboard; rollback değerlendir |
| `Too many requests` | IP rate limit (20/dk) | Bekle; trafik analizi |
| `Unsupported AI_PROVIDER` | Yanlış env değeri | Env düzelt |
| 5xx spike | Genel proxy hatası | Rollback §10 |

**İlk 30 dk:** 5 dakikada bir log kontrol.

---

## 8. OpenAI Usage / Quota İzleme

**Yol:** OpenAI Platform → Usage / Billing

| Kontrol | FAIL eşiği |
|---------|------------|
| İstekler görünüyor mu? | Smoke sonrası 15 dk içinde usage yok → upstream/auth sorunu |
| Rate limit / 429 | Sürekli → rollback veya quota artırımı |
| Billing uyarısı | Aktif uyarı → STOP, Production NO-GO |
| Model (`OPENAI_MODEL` veya default `gpt-4o-mini`) | Unexpected model errors in logs |

---

## 9. 24–48 Saat Gözlem Planı

| Zaman | Engineering / Ops | Product | Legal (gerekirse) |
|-------|-------------------|---------|-------------------|
| T+0–30m | Live smoke + log tail | `/auto/` spot check | — |
| T+1h | 5xx/429 oranı, latency | Fallback şikayeti var mı | — |
| T+4h | OpenAI cost snapshot | Commentary kalitesi örnekleri | — |
| T+24h | 5xx/429 trend, maliyet | UX regression | Subprocessor disclosure yeterli mi |
| T+48h | GO/NO-GO retrospective | Sign-off | Compliance kapanış |

**Metrikler:**

- `/ai-proxy` 5xx oranı
- 429 oranı
- Client fallback oranı (ops gözlemi)
- OpenAI günlük maliyet
- Ortalama latency (Functions log)

---

## 10. Rollback Prosedürü

1. Cloudflare → Production env → `AI_PROVIDER` **sil** veya `groq`
2. **`GROQ_API_KEY` dokunma** — rollback için zorunlu
3. `OPENAI_API_KEY` silinmek zorunda değil (`AI_PROVIDER` groq/unset iken pasif)
4. Env reload bekle (≈1–3 dk)
5. Groq curl smoke:

```bash
curl -sS -w "\nHTTP:%{http_code}\n" -X POST "<PRODUCTION_URL>/ai-proxy" \
  -H "Content-Type: application/json" \
  -H "Origin: <ORIGIN>" \
  -d '{"prompt":"Rollback Groq production test."}'
```

6. **Beklenen:** HTTP `200` + Groq yanıtı
7. `/auto/` browser → commentary akışı kontrol
8. **Kod rollback gerekmez**
9. Olay kaydı: flip zamanı, rollback zamanı, log özeti

Provider-prefixed cache nedeniyle OpenAI cache entry’leri Groq rollback sonrası servis edilmez.

---

## 11. Stop Condition Listesi

| # | Koşul | Aksiyon |
|---|-------|---------|
| S1 | Legal sign-off yok | **STOP** — Production flip yapma |
| S2 | Yanlış scope (Preview yerine Production karışıklığı) | **STOP** — scope doğrula |
| S3 | `AI_PROVIDER=openai` key’lerden önce set edildi | **STOP** — geri al |
| S4 | Production live smoke 500/403 | Rollback §10 |
| S5 | Structured JSON parse fail | Rollback §10 |
| S6 | `/auto/` sürekli rule-based fallback | Rollback §10; Production NO-GO |
| S7 | OpenAI quota/billing uyarısı | Rollback §10; Production NO-GO |
| S8 | Rollback Groq curl FAIL | Incident; env + key triage |
| S9 | Secret repo/chat’e yazılıyor | **STOP** — sızıntı prosedürü |

---

## 12. GO / NO-GO Karar Tablosu

| Kriter | GO | NO-GO |
|--------|----|----|
| Preview smoke (tüm maddeler) | PASS | Herhangi FAIL |
| Legal/compliance sign-off | Tamam | Eksik |
| Production env sırası | Doğru uygulandı | Yanlış sıra / key eksik |
| Live curl smoke | 200 `{result}` | 5xx/403 |
| Structured JSON smoke | Parse OK | Fail |
| `/auto/` browser | 200 + commentary | Sürekli fallback |
| Rollback (Preview’da doğrulandı) | PASS | FAIL |
| 24–48h izleme | Eşik içinde | 5xx/429/maliyet anomali |

**Production OpenAI GO** = tüm satırlar GO + §0 sign-off tamam.

**Mevcut durum (AI-D5-2):** Production OpenAI activation **NO-GO** — Legal sign-off ve Production live smoke tamamlanmadan flip yapılmaz.

---

## 13. Sign-Off (Activation Window)

| Rol | Kontrol | Onay (✓) | İsim | Tarih |
|-----|---------|----------|------|-------|
| **Engineering** | Preview PASS; live smoke curl + structured JSON | | | |
| **Ops** | Env sırası; rollback test; log/quota izleme | | | |
| **Product** | `/auto/` UX; commentary kalitesi | | | |
| **Legal** | SUBPROCESSORS; kvkk/gizlilik; SCC/TIA; DPA | | | |

---

*AI-D5-2 — Production activation runbook. Henüz uygulanmadı. Runtime kod değişikliği yok.*
