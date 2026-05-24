# Homepage positioning audit & rewrite

**Date:** 2026-05-23  
**Goal:** 5-second clarity, decision confidence, premium fintech tone — less abstract “platform/AI” language.

## Diagnosis (before)

| Area | Issue |
|------|--------|
| Hero | “Veriye dayalı netleştirin” — abstract; benefit delayed |
| Subtitle / nav | “Karar zekâsı platformu” — category jargon |
| Trust | “Kurumsal altyapı”, “denetlenebilir metodoloji” — infrastructure, not user outcome |
| CTA | Mixed (“Ücretsiz analiz” vs “Karar analizini başlat”) |
| Features | “Karar modeli”, “sistematik” — enterprise filler |
| Tone | Reads like B2B SaaS pitch, not “what I get in 5 seconds” |

## Positioning shift

| From | To |
|------|-----|
| AI / platform / zekâ | **Net maliyet, güven, seçim** |
| Kurumsal altyapı | **Tarafsız, açık kalemler** |
| Metodoloji (nav) | **Nasıl hesaplıyoruz** |
| Karar analizi | **Net karar özeti** (primary CTA) |
| Karar skoru | **Uyum skoru** (preview) |

## Rewrite map (live copy)

Implemented in `index.html`, `js/ui/comparison-ui.js`, `js/ui/assistant-ui.js`.

| Block | New headline / CTA |
|-------|-------------------|
| Hero H1 | Hangi aracın size gerçekten uyduğunu görün. |
| Hero sub | Kredi, sigorta, yakıt ve 12 aylık toplam maliyet — tek özet. |
| Primary CTA | Net karar özeti al |
| Trust H2 | Rakamlar gizlenmez. Satıcı sizi yönlendirmez. |
| Compare | İki modeli yan yana koyun |
| Assistant | Satın alma planınızı netleştirin |

## Conversion principles (maintain)

1. **One idea above the fold:** gerçek maliyet + tarafsızlık  
2. **Proof chips:** ücretsiz, taahhüt yok, zorunlu satın alma yok  
3. **No hype timers** — avoid “2 dk ücretsiz”  
4. **Trust = specific:** KVKK, TLS, tarafsız, açık formül  

## QA

- [ ] Mobile: H1 readable in 2 lines  
- [ ] Primary CTA visible without scroll (sticky on mobile)  
- [ ] `/auto/` funnel message matches hero promise  
