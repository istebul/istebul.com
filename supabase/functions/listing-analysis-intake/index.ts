import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedOrigin, resolveCorsOrigin } from "../_shared/cors-origins.ts";

const CURRENT_YEAR = new Date().getFullYear();

type ListingType = "vehicle" | "housing";

function headers(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(origin), "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function safeNumber(value: unknown) {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function riskFromScore(score: number) {
  if (score >= 70) return "düşük";
  if (score >= 45) return "orta";
  return "yüksek";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Çok uygun";
  if (score >= 65) return "Uygun";
  if (score >= 45) return "Dikkatli değerlendir";
  return "Riskli ilan";
}

const VEHICLE_FUEL_ANNUAL_COST: Record<string, number> = {
  benzin: 42000,
  dizel: 36000,
  lpg: 30000,
  hibrit: 24000,
  elektrik: 12000,
};

const HOUSING_SQM_BENCHMARK: Record<string, number> = {
  default: 28000,
  istanbul: 45000,
  ankara: 32000,
  izmir: 38000,
  antalya: 35000,
  bursa: 30000,
};

const MAX_URL_LENGTH = 1000;
const BLOCKED_PROTOCOL_PREFIXES = [
  "javascript:",
  "data:",
  "file:",
  "ftp:",
  "blob:",
  "chrome:",
  "about:",
];
const DOMAIN_LABELS = [
  { match: "sahibinden.com", label: "Sahibinden" },
  { match: "arabam.com", label: "Arabam" },
  { match: "emlakjet.com", label: "Emlakjet" },
  { match: "hepsiemlak.com", label: "Hepsiemlak" },
];
const INPUT_SOURCE_MAP: Record<string, string> = {
  "sahibinden.com": "sahibinden",
  "emlakjet.com": "emlakjet",
  "arabam.com": "arabam",
  "hepsiemlak.com": "hepsiemlak",
};
const RISKY_QUERY_PARAMS = new Set(["fbclid", "gclid", "gclsrc", "ref", "mc_eid", "mc_cid"]);
const URL_SECURITY_ERROR = "Geçersiz bağlantı. Yalnızca http veya https adresleri kabul edilir.";

function normalizeHostname(hostname: string) {
  return String(hostname || "").toLowerCase().replace(/^www\./, "");
}

function isPrivateOrBlockedHost(hostname: string) {
  const host = normalizeHostname(hostname);
  if (!host) return true;
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1).map((n) => Number(n));
  if (octets.some((n) => n < 0 || n > 255)) return true;
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function resolveSourceLabel(hostname: string) {
  const host = normalizeHostname(hostname);
  for (const entry of DOMAIN_LABELS) {
    if (host === entry.match || host.endsWith(`.${entry.match}`)) {
      return { domain: entry.match, label: entry.label };
    }
  }
  return { domain: host, label: "Diğer" };
}

function resolveInputSource(sourceDomain: string) {
  const domain = normalizeHostname(sourceDomain);
  return INPUT_SOURCE_MAP[domain] || "external_url";
}

function resolveUrlMode(input: Record<string, unknown>, options: { url_mode?: string } = {}) {
  const override = options.url_mode || String(input.url_mode || input._url_mode || "");
  if (override === "partner_api") return "partner_api";
  if (String(input.listing_url ?? "").trim()) return override || "paste_url";
  return "manual";
}

function resolveResultSource(input: Record<string, unknown>, options: { result_source?: string } = {}) {
  if (options.result_source) return options.result_source;
  if (input.result_source) return String(input.result_source);
  return "rules_engine";
}

function stripRiskyParams(searchParams: URLSearchParams) {
  for (const key of [...searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith("utm_") || RISKY_QUERY_PARAMS.has(lower)) {
      searchParams.delete(key);
    }
  }
}

function parseListingUrl(rawUrl: unknown) {
  const trimmed = String(rawUrl ?? "").trim();
  if (!trimmed) {
    return {
      isValid: true,
      normalizedUrl: null,
      sourceDomain: null,
      sourceLabel: null,
      inputSource: "manual",
      error: null,
    };
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      isValid: false,
      normalizedUrl: null,
      sourceDomain: null,
      sourceLabel: null,
      inputSource: null,
      error: "URL çok uzun (maksimum 1000 karakter).",
    };
  }
  const lower = trimmed.toLowerCase();
  for (const prefix of BLOCKED_PROTOCOL_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return {
        isValid: false,
        normalizedUrl: null,
        sourceDomain: null,
        sourceLabel: null,
        inputSource: null,
        error: URL_SECURITY_ERROR,
      };
    }
  }
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      isValid: false,
      normalizedUrl: null,
      sourceDomain: null,
      sourceLabel: null,
      inputSource: null,
      error: "Geçersiz URL formatı.",
    };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      isValid: false,
      normalizedUrl: null,
      sourceDomain: null,
      sourceLabel: null,
      inputSource: null,
      error: URL_SECURITY_ERROR,
    };
  }
  const normalizedHost = normalizeHostname(parsed.hostname);
  if (isPrivateOrBlockedHost(normalizedHost)) {
    return {
      isValid: false,
      normalizedUrl: null,
      sourceDomain: null,
      sourceLabel: null,
      inputSource: null,
      error: "Bu bağlantı türüne izin verilmez.",
    };
  }
  if (normalizedHost !== parsed.hostname) parsed.hostname = normalizedHost;
  parsed.hash = "";
  stripRiskyParams(parsed.searchParams);
  parsed.search = parsed.searchParams.toString() ? `?${parsed.searchParams.toString()}` : "";
  const { domain, label } = resolveSourceLabel(normalizedHost);
  return {
    isValid: true,
    normalizedUrl: parsed.href,
    sourceDomain: domain,
    sourceLabel: label,
    inputSource: resolveInputSource(domain),
    error: null,
  };
}

function attachListingUrlFields(
  input: Record<string, unknown>,
  options: { url_mode?: string; result_source?: string } = {},
) {
  const raw = String(input.listing_url ?? "").trim();
  const resultSource = resolveResultSource(input, options);
  const urlMode = resolveUrlMode({ ...input, listing_url: raw || null }, options);

  if (!raw) {
    return {
      ...input,
      listing_url: null,
      normalized_url: null,
      source_domain: null,
      source_label: null,
      input_source: "manual",
      result_source: resultSource,
      url_mode: urlMode,
    };
  }

  const parsed = parseListingUrl(raw);
  if (!parsed.isValid) return { ...input, _urlError: parsed.error };
  return {
    ...input,
    listing_url: parsed.normalizedUrl,
    normalized_url: parsed.normalizedUrl,
    source_domain: parsed.sourceDomain,
    source_label: parsed.sourceLabel,
    input_source: parsed.inputSource,
    result_source: resultSource,
    url_mode: urlMode,
  };
}

function buildListingAnalysisMetadata(input: Record<string, unknown>) {
  const listingUrl = input.listing_url || null;
  const normalizedUrl = input.normalized_url || listingUrl || null;
  return {
    listing_url: listingUrl,
    normalized_url: normalizedUrl,
    input_source: input.input_source || (listingUrl ? "external_url" : "manual"),
    result_source: input.result_source || "rules_engine",
    url_mode: input.url_mode || (listingUrl ? "paste_url" : "manual"),
    source_label: input.source_label || null,
  };
}

function buildListingAnalysisEventPayload(
  input: Record<string, unknown>,
  listingType: ListingType,
  result: Record<string, unknown>,
) {
  return {
    ...buildListingAnalysisMetadata(input),
    listing_type: listingType,
    decision_score: result.decisionScore ?? null,
    confidence_score: result.confidenceScore ?? null,
  };
}

function sanitizeListingInputForStorage(input: Record<string, unknown>) {
  const clean = { ...input };
  delete clean._urlError;
  delete clean._url_mode;
  return clean;
}

function buildResultSourceMeta(input: Record<string, unknown>) {
  const metadata = buildListingAnalysisMetadata(input);
  if (!metadata.listing_url) {
    return {
      listingUrl: null,
      domain: null,
      label: null,
      mode: null,
      inputSource: metadata.input_source,
      resultSource: metadata.result_source,
      urlMode: metadata.url_mode,
    };
  }
  return {
    listingUrl: metadata.listing_url,
    domain: input.source_domain || null,
    label: metadata.source_label || "Diğer",
    mode: metadata.url_mode,
    inputSource: metadata.input_source,
    resultSource: metadata.result_source,
    urlMode: metadata.url_mode,
  };
}

function normalizeCityKey(city: string) {
  const key = city.toLocaleLowerCase("tr-TR");
  if (key.includes("istanbul") || key.includes("İstanbul".toLocaleLowerCase("tr-TR"))) return "istanbul";
  if (key.includes("ankara")) return "ankara";
  if (key.includes("izmir")) return "izmir";
  if (key.includes("antalya")) return "antalya";
  if (key.includes("bursa")) return "bursa";
  return "default";
}

function computeConfidenceScore(type: ListingType, input: Record<string, unknown>) {
  if (type === "vehicle") {
    const fields = ["marka", "model", "yil", "km", "yakit_turu", "fiyat", "il"];
    const filled = fields.filter((f) => cleanText(input[f])).length;
    let score = Math.round((filled / fields.length) * 55);
    if (cleanText(input.il)) score += 20;
    if (cleanText(input.marka) && cleanText(input.model)) score += 15;
    if (safeNumber(input.yil) > 0 && safeNumber(input.km) >= 0) score += 10;
    return clampScore(score);
  }

  const fields = ["il", "ilce", "metrekare", "oda_sayisi", "bina_yasi", "fiyat", "kullanim_amaci"];
  const filled = fields.filter((f) => cleanText(input[f])).length;
  let score = Math.round((filled / fields.length) * 50);
  if (cleanText(input.il) && cleanText(input.ilce)) score += 25;
  if (safeNumber(input.metrekare) > 0 && safeNumber(input.fiyat) > 0) score += 15;
  if (safeNumber(input.bina_yasi) >= 0) score += 10;
  return clampScore(score);
}

function validateListingInput(type: ListingType, input: Record<string, unknown>) {
  const errors: string[] = [];
  const rawUrl = cleanText(input.listing_url, 1000);
  if (rawUrl) {
    const urlCheck = parseListingUrl(rawUrl);
    if (!urlCheck.isValid) errors.push(urlCheck.error || "Geçersiz ilan bağlantısı.");
  }

  if (type === "vehicle") {
    if (!cleanText(input.marka)) errors.push("Marka zorunludur.");
    if (!cleanText(input.model)) errors.push("Model zorunludur.");
    const year = safeNumber(input.yil);
    if (!year || year < 1990 || year > CURRENT_YEAR + 1) errors.push("Geçerli bir model yılı girin.");
    const km = safeNumber(input.km);
    if (km < 0 || km > 1_500_000) errors.push("Geçerli bir kilometre değeri girin.");
    if (!cleanText(input.yakit_turu)) errors.push("Yakıt türü seçin.");
    const price = safeNumber(input.fiyat);
    if (!price || price < 50_000) errors.push("Geçerli bir fiyat girin.");
    return { valid: errors.length === 0, errors };
  }

  if (!cleanText(input.il)) errors.push("İl zorunludur.");
  if (!cleanText(input.ilce)) errors.push("İlçe zorunludur.");
  const sqm = safeNumber(input.metrekare);
  if (!sqm || sqm < 20 || sqm > 2000) errors.push("Geçerli bir m² değeri girin.");
  const rooms = safeNumber(input.oda_sayisi);
  if (!rooms || rooms < 1 || rooms > 20) errors.push("Geçerli bir oda sayısı girin.");
  const age = safeNumber(input.bina_yasi);
  if (age < 0 || age > 120) errors.push("Geçerli bir bina yaşı girin.");
  const price = safeNumber(input.fiyat);
  if (!price || price < 100_000) errors.push("Geçerli bir fiyat girin.");
  const usage = cleanText(input.kullanim_amaci);
  if (!["oturum", "yatirim", "belirsiz"].includes(usage)) errors.push("Kullanım amacı seçin.");
  return { valid: errors.length === 0, errors };
}

function analyzeVehicleListing(input: Record<string, unknown>) {
  const year = safeNumber(input.yil);
  const km = safeNumber(input.km);
  const price = safeNumber(input.fiyat);
  const fuel = cleanText(input.yakit_turu, 20) || "benzin";
  const ageYears = Math.max(0, CURRENT_YEAR - year);

  let decisionScore = 58;
  const factors: Array<Record<string, string>> = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (ageYears <= 3) {
    decisionScore += 18;
    strengths.push("Güncel model yılı düşük amortisman riski sunar.");
    factors.push({ key: "year", label: "Model yılı", impact: "positive", detail: `${year} — düşük yaş` });
  } else if (ageYears <= 7) {
    decisionScore += 10;
    strengths.push("Orta yaş bandında makul değerleme potansiyeli.");
    factors.push({ key: "year", label: "Model yılı", impact: "neutral", detail: `${year}` });
  } else if (ageYears <= 12) {
    decisionScore -= 4;
    weaknesses.push("Araç yaşı bakım ve yenileme maliyetlerini artırabilir.");
    factors.push({ key: "year", label: "Model yılı", impact: "negative", detail: `${year} — orta-yüksek yaş` });
  } else {
    decisionScore -= 16;
    weaknesses.push("Eski model yılı teknik risk ve değer kaybı baskısı oluşturur.");
    factors.push({ key: "year", label: "Model yılı", impact: "negative", detail: `${year} — yüksek yaş` });
  }

  if (km <= 50_000) {
    decisionScore += 12;
    strengths.push("Düşük kilometre kullanım izlenimi güçlendirir.");
    factors.push({ key: "km", label: "Kilometre", impact: "positive", detail: `${km} km` });
  } else if (km <= 100_000) {
    decisionScore += 6;
    factors.push({ key: "km", label: "Kilometre", impact: "neutral", detail: `${km} km` });
  } else if (km <= 180_000) {
    decisionScore -= 6;
    weaknesses.push("Yüksek kilometre mekanik aşınma riskini artırır.");
    factors.push({ key: "km", label: "Kilometre", impact: "negative", detail: `${km} km` });
  } else {
    decisionScore -= 14;
    weaknesses.push("Çok yüksek kilometre bakım ve satış likiditesi riski taşır.");
    factors.push({ key: "km", label: "Kilometre", impact: "negative", detail: `${km} km` });
  }

  const expectedPrice = Math.max(120_000, 1_450_000 - ageYears * 55_000 - Math.floor(km / 1000) * 420);
  const priceRatio = price / expectedPrice;
  let priceFit = 72;

  if (priceRatio <= 0.88) {
    priceFit += 18;
    strengths.push("Fiyat bandı model profiline göre uygun görünüyor.");
    factors.push({ key: "price", label: "Fiyat uygunluğu", impact: "positive", detail: "Beklenen bandın altında" });
  } else if (priceRatio <= 1.05) {
    priceFit += 6;
    factors.push({ key: "price", label: "Fiyat uygunluğu", impact: "neutral", detail: "Beklenen banda yakın" });
  } else if (priceRatio <= 1.2) {
    priceFit -= 12;
    weaknesses.push("Fiyat beklentinin üzerinde; pazarlık marjı sınırlı olabilir.");
    factors.push({ key: "price", label: "Fiyat uygunluğu", impact: "negative", detail: "Beklenen bandın üstünde" });
  } else {
    priceFit -= 24;
    weaknesses.push("Fiyat profili agresif; değerleme uyumsuzluğu riski yüksek.");
    factors.push({ key: "price", label: "Fiyat uygunluğu", impact: "negative", detail: "Belirgin yüksek fiyat" });
  }

  decisionScore += Math.round((priceFit - 60) * 0.25);
  priceFit = clampScore(priceFit);

  const annualFuel = VEHICLE_FUEL_ANNUAL_COST[fuel] || VEHICLE_FUEL_ANNUAL_COST.benzin;
  const maintenance = Math.max(8000, 14000 + ageYears * 900 + Math.floor(km / 50_000) * 2500);
  const insurance = Math.max(6000, Math.round(price * 0.028));
  const totalCostEstimate = {
    purchasePrice: price,
    annualFuelCost: annualFuel,
    annualMaintenance: maintenance,
    annualInsurance: insurance,
    firstYearTotal: price + annualFuel + maintenance + insurance,
    currency: "TRY",
    note: "İlk yıl toplam sahiplik maliyeti tahminidir.",
  };

  if (fuel === "elektrik" || fuel === "hibrit") {
    strengths.push("Yakıt maliyeti düşük enerji profili avantaj sağlar.");
  } else if (fuel === "benzin") {
    weaknesses.push("Benzinli profil yıllık yakıt maliyetini yükseltir.");
  }

  if (cleanText(input.il)) {
    strengths.push("Konum bilgisi mevcut; bölgesel piyasa bağlamı güçlendirildi.");
    factors.push({ key: "location", label: "Konum", impact: "positive", detail: cleanText(input.il) });
  }

  decisionScore = clampScore(decisionScore);
  const confidenceScore = computeConfidenceScore("vehicle", input);
  const riskScore = 100 - decisionScore + (ageYears > 10 ? 8 : 0) + (km > 150_000 ? 10 : 0);
  const riskLevel = riskFromScore(100 - clampScore(riskScore));

  return {
    listingType: "vehicle",
    decisionScore,
    confidenceScore,
    priceFit,
    riskLevel,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    totalCostEstimate,
    summary: `${cleanText(input.marka)} ${cleanText(input.model)} (${year}) için karar skoru ${decisionScore}/100.`,
    factors,
    scoreLabel: scoreLabel(decisionScore),
    source: buildResultSourceMeta(input),
  };
}

function analyzeHousingListing(input: Record<string, unknown>) {
  const sqm = safeNumber(input.metrekare);
  const price = safeNumber(input.fiyat);
  const buildingAge = safeNumber(input.bina_yasi);
  const usage = cleanText(input.kullanim_amaci) || "oturum";
  const cityKey = normalizeCityKey(cleanText(input.il));
  const sqmPrice = sqm > 0 ? price / sqm : 0;
  const benchmark = HOUSING_SQM_BENCHMARK[cityKey] || HOUSING_SQM_BENCHMARK.default;

  let decisionScore = 56;
  let priceFit = 68;
  const factors: Array<Record<string, string>> = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (sqmPrice > 0 && sqmPrice <= benchmark * 0.9) {
    priceFit += 20;
    strengths.push("m² fiyatı bölge referansının altında; fiyat uygunluğu güçlü.");
    factors.push({ key: "sqm_price", label: "m² fiyatı", impact: "positive", detail: `${Math.round(sqmPrice)} ₺/m²` });
  } else if (sqmPrice <= benchmark * 1.08) {
    priceFit += 8;
    factors.push({ key: "sqm_price", label: "m² fiyatı", impact: "neutral", detail: `${Math.round(sqmPrice)} ₺/m²` });
  } else if (sqmPrice <= benchmark * 1.25) {
    priceFit -= 14;
    weaknesses.push("m² fiyatı bölge ortalamasının üzerinde.");
    factors.push({ key: "sqm_price", label: "m² fiyatı", impact: "negative", detail: "Referansın üstünde" });
  } else {
    priceFit -= 26;
    weaknesses.push("Agresif m² fiyatı likidite ve değerleme riski oluşturur.");
    factors.push({ key: "sqm_price", label: "m² fiyatı", impact: "negative", detail: "Belirgin yüksek" });
  }

  if (buildingAge <= 5) {
    decisionScore += 14;
    strengths.push("Yeni veya genç bina yapısı bakım riskini düşürür.");
    factors.push({ key: "building_age", label: "Bina yaşı", impact: "positive", detail: `${buildingAge} yıl` });
  } else if (buildingAge <= 15) {
    decisionScore += 4;
    factors.push({ key: "building_age", label: "Bina yaşı", impact: "neutral", detail: `${buildingAge} yıl` });
  } else if (buildingAge <= 30) {
    decisionScore -= 8;
    weaknesses.push("Orta-yüksek bina yaşı yenileme ihtiyacı doğurabilir.");
    factors.push({ key: "building_age", label: "Bina yaşı", impact: "negative", detail: `${buildingAge} yıl` });
  } else {
    decisionScore -= 16;
    weaknesses.push("Eski bina stoku deprem ve tadilat riskini artırır.");
    factors.push({ key: "building_age", label: "Bina yaşı", impact: "negative", detail: `${buildingAge} yıl` });
  }

  if (usage === "yatirim") {
    if (priceFit >= 70) {
      decisionScore += 6;
      strengths.push("Yatırım profili için fiyat/likidite dengesi olumlu.");
    } else {
      decisionScore -= 10;
      weaknesses.push("Yatırım amacında fiyat uygunluğu ve likidite baskısı var.");
    }
    factors.push({ key: "usage", label: "Kullanım amacı", impact: "neutral", detail: "Yatırım" });
  } else if (usage === "oturum") {
    decisionScore += 4;
    strengths.push("Oturum profili uzun vadeli kullanım senaryosuna uygun.");
    factors.push({ key: "usage", label: "Kullanım amacı", impact: "positive", detail: "Oturum" });
  } else {
    factors.push({ key: "usage", label: "Kullanım amacı", impact: "neutral", detail: "Belirsiz" });
  }

  decisionScore += Math.round((priceFit - 65) * 0.3);
  decisionScore = clampScore(decisionScore);
  priceFit = clampScore(priceFit);

  const tapuMasraf = Math.round(price * 0.04);
  const firstYearExpense = Math.round(price * 0.015) + (buildingAge > 20 ? 12000 : 6000);
  const totalCostEstimate = {
    purchasePrice: price,
    deedAndFees: tapuMasraf,
    firstYearExpense,
    totalAcquisitionCost: price + tapuMasraf + firstYearExpense,
    sqmPrice: Math.round(sqmPrice),
    benchmarkSqmPrice: benchmark,
    currency: "TRY",
    note: "Toplam maliyet = fiyat + tahmini tapu/masraf + ilk yıl gider.",
  };

  if (cleanText(input.il) && cleanText(input.ilce)) {
    strengths.push("İl/ilçe bilgisi mevcut; lokasyon güven skorunu artırır.");
    factors.push({ key: "location", label: "Konum", impact: "positive", detail: `${cleanText(input.il)} / ${cleanText(input.ilce)}` });
  }

  const confidenceScore = computeConfidenceScore("housing", input);
  const riskLevel = riskFromScore(100 - decisionScore + (buildingAge > 25 ? 8 : 0) + (priceFit < 50 ? 10 : 0));

  return {
    listingType: "housing",
    decisionScore,
    confidenceScore,
    priceFit,
    riskLevel,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    totalCostEstimate,
    summary: `${cleanText(input.il)} ${cleanText(input.ilce)} ${sqm} m² konut için karar skoru ${decisionScore}/100.`,
    factors,
    scoreLabel: scoreLabel(decisionScore),
    source: buildResultSourceMeta(input),
  };
}

function buildListingAnalysisResult(type: ListingType, input: Record<string, unknown>) {
  const withUrl = attachListingUrlFields(input);
  if ((withUrl as Record<string, unknown>)._urlError) {
    return { ok: false as const, errors: [String((withUrl as Record<string, unknown>)._urlError)] };
  }
  const validation = validateListingInput(type, withUrl);
  if (!validation.valid) return { ok: false as const, errors: validation.errors };
  const result = type === "vehicle" ? analyzeVehicleListing(withUrl) : analyzeHousingListing(withUrl);
  return { ok: true as const, result };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const allowed = !origin || isAllowedOrigin(origin);

  if (req.method === "OPTIONS") {
    if (!allowed) return new Response(null, { status: 403 });
    return new Response("ok", { headers: headers(origin) });
  }
  if (!allowed) return json({ ok: false, error: "Forbidden origin" }, 403, "https://www.istebul.com");
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ ok: false, error: "Service unavailable" }, 500, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400, origin);
  }

  const listingType = String(body.listing_type || "") as ListingType;
  if (listingType !== "vehicle" && listingType !== "housing") {
    return json({ ok: false, error: "Invalid listing_type" }, 400, origin);
  }

  const rawInput =
    body.input && typeof body.input === "object" ? (body.input as Record<string, unknown>) : {};
  const intakeOptions = {
    url_mode: body.url_mode === "partner_api" ? "partner_api" : undefined,
    result_source: "rules_engine",
  };
  const input = attachListingUrlFields(rawInput, intakeOptions);
  if ((input as Record<string, unknown>)._urlError) {
    return json({ ok: false, error: String((input as Record<string, unknown>)._urlError) }, 400, origin);
  }

  const storedInput = sanitizeListingInputForStorage(input);
  const built = buildListingAnalysisResult(listingType, storedInput);
  if (!built.ok) {
    return json({ ok: false, error: built.errors.join(" ") }, 400, origin);
  }

  const adminClient = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get("authorization") || "";
  let userId: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data } = await adminClient.auth.getUser(token);
      userId = data?.user?.id || null;
    }
  }

  const { data: analysisRow, error: analysisError } = await adminClient
    .from("listing_analyses")
    .insert({
      user_id: userId,
      listing_type: listingType,
      input: storedInput,
      result: built.result,
      decision_score: built.result.decisionScore,
      confidence_score: built.result.confidenceScore,
    })
    .select("id")
    .single();

  if (analysisError) return json({ ok: false, error: "Analysis recording failed" }, 500, origin);

  const analysisId = analysisRow?.id || null;
  if (analysisId) {
    await adminClient.from("listing_analysis_events").insert({
      analysis_id: analysisId,
      event_type: "analysis_completed",
      payload: buildListingAnalysisEventPayload(storedInput, listingType, built.result),
    });
  }

  return json({ ok: true, analysis_id: analysisId, result: built.result }, 200, origin);
});
