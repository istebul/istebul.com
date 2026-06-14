# AI Provider Runbook

## Kapsam

- AI-D1/D2/D3 sonrası `/ai-proxy` provider-aware hale geldi.
- Bu doküman yalnızca operasyonel env ve dokümantasyon rehberidir.
- Runtime kod değişikliği içermez.

İlgili runtime dosyalar (referans):

- `functions/ai-proxy.js`
- `functions/_shared/ai/provider-registry.js`
- `functions/_shared/ai/groq-provider.js`
- `functions/_shared/ai/openai-provider.js`
- `functions/_shared/ai/types.js`

---

## Varsayılan Davranış

| Özellik | Değer |
|---------|-------|
| `AI_PROVIDER` unset veya `groq` | Groq kullanılır |
| `DEFAULT_AI_PROVIDER` | `groq` |
| Groq model | `llama-3.1-8b-instant` |
| OpenAI default model | `gpt-4o-mini` (`OPENAI_MODEL` ile override edilebilir) |
| Success response | `{ "result": string }` |
| Error response | `{ "error": string }` |

Provider seçimi **explicit**tir: `AI_PROVIDER=openai` iken Groq key mevcut olsa bile OpenAI key yoksa istek başarısız olur.

---

## Desteklenen Provider Değerleri

| Değer | Adapter | Gerekli secret |
|-------|---------|----------------|
| `groq` | `callGroqChatCompletion` | `GROQ_API_KEY` |
| `openai` | `callOpenAiChatCompletion` | `OPENAI_API_KEY` |

Unsupported değerlerde:

- HTTP `500`
- `{ "error": "Unsupported AI_PROVIDER: <value>" }`

---

## Env Değişkenleri

| Değişken | Zorunluluk | Açıklama |
|----------|------------|----------|
| `AI_PROVIDER` | Opsiyonel | Unset veya boş → `groq`. Desteklenen: `groq`, `openai` (case-insensitive). |
| `GROQ_API_KEY` | `AI_PROVIDER` unset veya `groq` iken **zorunlu** | Groq chat completions API key. |
| `OPENAI_API_KEY` | `AI_PROVIDER=openai` iken **zorunlu** | OpenAI chat completions API key. |
| `OPENAI_MODEL` | Opsiyonel | OpenAI model override. Unset ise runtime default: `gpt-4o-mini`. |
| `AI_PROXY_TOKEN` | Opsiyonel | `/ai-proxy` POST için ek koruma; `x-ai-proxy-token` header ile eşleşmeli. |

**Önemli kurallar:**

- `GROQ_API_KEY`, default/`groq` için zorunludur.
- `OPENAI_API_KEY` yalnızca `AI_PROVIDER=openai` iken zorunludur.
- `OPENAI_MODEL` opsiyonel override’dır.
- Provider’lar arasında **otomatik fallback yoktur**.
- `AI_PROVIDER=openai` seçiliyken `GROQ_API_KEY` olsa bile `OPENAI_API_KEY` yoksa hata döner: `OPENAI_API_KEY missing`.

Env örneği: `.env.example` (AI Proxy bölümü).

Cloudflare Pages’ta bu değişkenler **Production / Preview** ortam değişkenleri olarak set edilir (GitHub Actions secret değil).

---

## Cache Davranışı

- Prompt cache anahtarı provider adıyla ayrılır (`promptCacheKey(prompt, providerName)` → `${providerName}:…` prefix).
- Aynı prompt Groq ve OpenAI arasında cache çakışması yapmaz.
- Rollback sonrası (provider `groq`/unset) Groq cache entry’leri ayrı tutulduğu için beklenmeyen OpenAI yanıtı servis edilmez.

---

## OpenAI Aktivasyonu İçin Önkoşullar

Bu doküman **tek başına production aktivasyon onayı değildir.**

Production OpenAI aktivasyonu aşağıdaki koşullar sağlanmadan **NO-GO**:

- Deploy rehberleri ve checklist güncellenmeden production aktivasyonu **NO-GO** (`docs/CLOUDFLARE_PAGES_DEPLOY.md`, `docs/CANLIYA_ALMA_REHBERI.md`, `docs/DEPLOYMENT_CHECKLIST.md` vb.).
- `SUBPROCESSORS` / compliance dokümanı OpenAI için güncellenmeden production aktivasyonu **NO-GO** (`docs/investor/SUBPROCESSORS.md`).
- Cloudflare **Preview** üzerinde manuel smoke yapılmadan production aktivasyonu **NO-GO**.

---

## Güvenli Preview Aktivasyon Planı

1. Cloudflare **Preview** ortamına `OPENAI_API_KEY` ekle (encrypted).
2. `AI_PROVIDER=openai` değerini **yalnızca Preview**’da set et.
3. `/ai-proxy` curl smoke yap.
4. `/auto/` AI commentary akışını kontrol et.
5. `structured_commentary` JSON mode akışını kontrol et (`format: structured_commentary`).
6. Cloudflare Functions log ve OpenAI usage dashboard izle.

### Curl smoke (Preview)

```bash
curl -sS -X POST "https://<preview-host>/ai-proxy" \
  -H "Content-Type: application/json" \
  -H "Origin: https://istebul.com" \
  -d '{"prompt":"Kısa bir test yanıtı ver."}'
```

**Beklenen:**

- HTTP `200`
- `{"result":"..."}`

**Hata örnekleri:**

- `500` + `{"error":"OPENAI_API_KEY missing"}` → key eksik veya yanlış ortam
- `403` + `{"error":"Forbidden"}` → geçersiz `Origin` ve `AI_PROXY_TOKEN` yok

---

## Production Aktivasyon Planı

Yalnızca dokümantasyon ve checklist tamamlandıktan sonra uygulanır:

1. Production’da `GROQ_API_KEY` **korunur** (rollback için).
2. Production’da `OPENAI_API_KEY` encrypted secret olarak eklenir.
3. Opsiyonel: `OPENAI_MODEL` eklenir (ör. `gpt-4o-mini`).
4. **En son adım:** Production’da `AI_PROVIDER=openai` set edilir.
5. Live smoke yapılır (curl + `/auto/` commentary).
6. İlk 24–48 saat 5xx, `429`, latency ve maliyet izlenir.

Yeni kod deploy’u gerekmez; yalnızca Cloudflare Pages env değişikliği yeterlidir.

---

## Rollback Planı

| Adım | Eylem |
|------|-------|
| 1 | Production’da `AI_PROVIDER` değişkenini **sil** veya `groq` yap |
| 2 | `GROQ_API_KEY` production’da **korunmalı** |
| 3 | `OPENAI_API_KEY` silinmek zorunda değil; `AI_PROVIDER` `groq`/unset olduğunda pasif kalır |
| 4 | Kod rollback **gerekmez** |
| 5 | Provider-prefixed cache nedeniyle cache çakışması beklenmez |

### Rollback curl smoke

```bash
curl -sS -X POST "https://www.istebul.com/ai-proxy" \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.istebul.com" \
  -d '{"prompt":"Rollback test"}'
```

**Beklenen (Groq default):**

- HTTP `200`
- `{"result":"..."}` (Groq üzerinden)

---

## Riskler ve Stop Koşulları

| Risk | Davranış / Etki | Şiddet |
|------|-----------------|--------|
| `AI_PROVIDER=openai` + `OPENAI_API_KEY` yok | `500` + `OPENAI_API_KEY missing`; client rule-based fallback devreye girer | Orta |
| `AI_PROVIDER` unset/`groq` + `GROQ_API_KEY` yok | `500` + `GROQ_API_KEY missing`; mevcut production default riski | Yüksek |
| OpenAI quota / rate limit | `500 OpenAI request failed` veya upstream 429; client fallback | Orta |
| Latency | OpenAI genelde Groq’tan yavaş; client timeout’ları etkilenebilir | Düşük–Orta |
| Model compatibility | `structured_commentary` → `response_format: json_object`; default `gpt-4o-mini` destekler | Düşük |
| Compliance / subprocessor eksikliği | KVKK/GDPR disclosure güncel değil | Yüksek — **stop** |
| Deploy docs / checklist eksikliği | Operasyonel aktivasyon belgelenmemiş | Yüksek — **stop** |

Client tarafı: skor ve fiyat kural motorundan gelir; AI proxy hatası narration’ı etkiler, karar skorunu değiştirmez.

---

## Aktivasyon Kararı

- **AI-D4-1A sonrası production OpenAI aktivasyonu hâlâ NO-GO.**
- Production **GO** için deploy rehberleri, checklist ve compliance/subprocessor dokümanı ayrıca güncellenmelidir.

---

*Son güncelleme: AI-D4-1A — env örneği + canonical runbook. Runtime kod değişikliği yok.*
