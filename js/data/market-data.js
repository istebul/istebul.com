export const MARKET_DATA_STORAGE_KEY = 'istebu_market_data';

export const DEFAULT_FINANCE_PRODUCTS = {
    arac: [
        { id: 'auto-a', bank: 'Banka A Taşıt Kredisi', rate: 3.39, term: 36, ratio: 0.7, type: 'taşıt' },
        { id: 'auto-b', bank: 'Banka B Taşıt Kredisi', rate: 3.55, term: 48, ratio: 0.65, type: 'taşıt' },
        { id: 'auto-c', bank: 'Banka C İhtiyaç Destekli', rate: 3.89, term: 24, ratio: 0.45, type: 'ihtiyaç' }
    ],
    ev: [
        { id: 'home-a', bank: 'Banka A Konut Kredisi', rate: 2.89, term: 120, ratio: 0.8, type: 'konut' },
        { id: 'home-b', bank: 'Banka B Konut Kredisi', rate: 3.05, term: 96, ratio: 0.75, type: 'konut' },
        { id: 'home-c', bank: 'Banka C Mortgage', rate: 3.19, term: 180, ratio: 0.7, type: 'mortgage' }
    ],
    tatil: [
        { id: 'travel-a', bank: 'Banka A Tatil Kredisi', rate: 4.05, term: 12, ratio: 0.8, type: 'tatil' },
        { id: 'travel-b', bank: 'Banka B İhtiyaç Kredisi', rate: 4.35, term: 18, ratio: 0.7, type: 'ihtiyaç' },
        { id: 'travel-c', bank: 'Banka C Kart Taksiti', rate: 3.75, term: 9, ratio: 0.6, type: 'kart' }
    ]
};


export const DEFAULT_COST_PROFILES = {
    arac: {
        basePrice: 950000,
        modelStep: 135000,
        premiumPriceExtra: 1200000,
        electricPriceExtra: 350000,
        suvPriceExtra: 260000,
        electricEnergyCost: 18000,
        hybridFuelCost: 52000,
        dieselFuelCost: 68000,
        gasolineFuelCost: 88000,
        insuranceStandardRate: 0.02,
        insurancePremiumRate: 0.027,
        trafficInsuranceBase: 12000,
        trafficInsurancePremiumExtra: 5000,
        maintenanceElectric: 9000,
        maintenanceStandard: 18000,
        maintenancePremium: 32000
    },
    ev: {
        metroBasePrice: 3200000,
        standardBasePrice: 2100000,
        yazlikMultiplier: 1.55,
        mustakilMultiplier: 2.1,
        villaMultiplier: 3.6,
        indexStep: 250000,
        apartmentDues: 36000,
        detachedMaintenance: 78000,
        villaMaintenance: 132000,
        insuranceRate: 0.0032,
        propertyTaxRate: 0.002,
        apartmentRenewal: 18000,
        houseRenewal: 46000
    },
    tatil: {
        familyBasePrice: 98000,
        luxuryBasePrice: 220000,
        natureBasePrice: 54000,
        cultureBasePrice: 86000,
        placeStep: 12000,
        accommodationRatio: 0.62,
        transportRatio: 0.2,
        activityRatio: 0.12,
        insuranceRatio: 0.06
    }
};

export const DEFAULT_SOURCE_REGISTRY = [
    { id: 'sahibinden-arac', category: 'arac', name: 'Sahibinden araç ilanları', type: 'listing', mode: 'external-link', status: 'ready', url: 'https://www.sahibinden.com/otomobil', cadence: 'Kullanıcı yönlendirme' },
    { id: 'arabam-arac', category: 'arac', name: 'Arabam araç karşılaştırma', type: 'listing', mode: 'external-link', status: 'ready', url: 'https://www.arabam.com/', cadence: 'Kullanıcı yönlendirme' },
    { id: 'sigortam-arac', category: 'arac', name: 'Sigortam kasko/sigorta', type: 'insurance', mode: 'external-link', status: 'ready', url: 'https://www.sigortam.net/', cadence: 'Kullanıcı yönlendirme' },
    { id: 'sahibinden-emlak', category: 'ev', name: 'Sahibinden emlak ilanları', type: 'listing', mode: 'external-link', status: 'ready', url: 'https://www.sahibinden.com/emlak', cadence: 'Kullanıcı yönlendirme' },
    { id: 'emlakjet-emlak', category: 'ev', name: 'Emlakjet emlak ilanları', type: 'listing', mode: 'external-link', status: 'ready', url: 'https://www.emlakjet.com/', cadence: 'Kullanıcı yönlendirme' },
    { id: 'hangikredi-konut', category: 'ev', name: 'Hangikredi konut kredisi', type: 'finance', mode: 'external-link', status: 'ready', url: 'https://www.hangikredi.com/kredi/konut-kredisi', cadence: 'Kullanıcı yönlendirme' },
    { id: 'etstur-tatil', category: 'tatil', name: 'ETS tatil paketleri', type: 'travel', mode: 'external-link', status: 'ready', url: 'https://www.etstur.com/', cadence: 'Kullanıcı yönlendirme' },
    { id: 'tatilsepeti-tatil', category: 'tatil', name: 'Tatilsepeti paketleri', type: 'travel', mode: 'external-link', status: 'ready', url: 'https://www.tatilsepeti.com/', cadence: 'Kullanıcı yönlendirme' },
    { id: 'enuygun-ulasim', category: 'tatil', name: 'Enuygun ulaşım karşılaştırma', type: 'travel', mode: 'external-link', status: 'ready', url: 'https://www.enuygun.com/', cadence: 'Kullanıcı yönlendirme' }
];

export const DEFAULT_MARKET_DATA = {
    version: 1,
    updatedAt: '2026-05-08T00:00:00.000Z',
    financeProducts: DEFAULT_FINANCE_PRODUCTS,
    costProfiles: DEFAULT_COST_PROFILES,
    sourceRegistry: DEFAULT_SOURCE_REGISTRY,
    integrations: {
        liveProvidersEnabled: false,
        providerMode: 'manual-ready',
        note: 'Dış siteler için güvenli entegrasyon katmanı hazır; canlı fiyat/komisyon verisi için resmi API veya iş ortaklığı anahtarı bağlanmalı.'
    }
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const canUseStorage = () => typeof localStorage !== 'undefined';

const safeParse = (rawValue, fallback) => {
    try {
        return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
        console.warn('Market data could not be parsed:', error);
        return fallback;
    }
};

export const normalizeMarketData = (data = {}) => ({
    ...clone(DEFAULT_MARKET_DATA),
    ...data,
    financeProducts: {
        ...clone(DEFAULT_FINANCE_PRODUCTS),
        ...(data.financeProducts || {})
    },
    costProfiles: Object.fromEntries(Object.entries(DEFAULT_COST_PROFILES).map(([categoryId, profile]) => [
        categoryId,
        {
            ...clone(profile),
            ...(data.costProfiles?.[categoryId] || {})
        }
    ])),
    sourceRegistry: Array.isArray(data.sourceRegistry) && data.sourceRegistry.length
        ? data.sourceRegistry
        : clone(DEFAULT_SOURCE_REGISTRY),
    integrations: {
        ...clone(DEFAULT_MARKET_DATA.integrations),
        ...(data.integrations || {})
    }
});

export const getMarketData = () => {
    if (!canUseStorage()) return clone(DEFAULT_MARKET_DATA);
    const stored = safeParse(localStorage.getItem(MARKET_DATA_STORAGE_KEY), null);
    return normalizeMarketData(stored || DEFAULT_MARKET_DATA);
};

export const saveMarketData = (data) => {
    const normalized = normalizeMarketData({ ...data, updatedAt: new Date().toISOString() });
    if (canUseStorage()) {
        localStorage.setItem(MARKET_DATA_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
};

export const resetMarketData = () => saveMarketData(clone(DEFAULT_MARKET_DATA));

export const getFinanceProductsForCategory = (marketData, categoryId) => {
    const normalized = normalizeMarketData(marketData);
    const products = normalized.financeProducts[categoryId];
    return Array.isArray(products) && products.length ? products : normalized.financeProducts.arac;
};

export const getCostProfileForCategory = (marketData, categoryId) => {
    const normalized = normalizeMarketData(marketData);
    return normalized.costProfiles[categoryId] || normalized.costProfiles.arac;
};

export const getSourceHealth = (marketData) => {
    const normalized = normalizeMarketData(marketData);
    const sources = normalized.sourceRegistry;
    const readySources = sources.filter((source) => source.status === 'ready').length;
    const financeSources = sources.filter((source) => source.type === 'finance').length;
    const categories = new Set(sources.map((source) => source.category));

    return {
        totalSources: sources.length,
        readySources,
        financeSources,
        categories: categories.size,
        liveProvidersEnabled: Boolean(normalized.integrations.liveProvidersEnabled),
        updatedAt: normalized.updatedAt
    };
};

export const getMarketStats = (marketData, catalog, decisionAssistant, decisionCount = 0, districtCount = 0) => {
    const normalizedMarketData = normalizeMarketData(marketData);
    const financeProducts = normalizedMarketData.financeProducts;
    const costProfiles = normalizedMarketData.costProfiles;
    const sourceHealth = getSourceHealth(marketData);

    return {
        categories: Object.keys(decisionAssistant).length,
        questions: Object.values(decisionAssistant).reduce((total, category) => total + category.questions.length, 0),
        options: Object.values(decisionAssistant).reduce((total, category) => total + category.options.length, 0),
        financeProducts: Object.values(financeProducts).reduce((total, products) => total + products.length, 0),
        costProfiles: Object.values(costProfiles).reduce((total, profile) => total + Object.keys(profile).length, 0),
        provinces: catalog.provinces.length,
        districts: districtCount,
        carModels: catalog.carModels.length,
        vacationPlaces: catalog.vacationPlaces.length,
        decisions: decisionCount,
        dataSources: sourceHealth.totalSources,
        readySources: sourceHealth.readySources,
        financeSources: sourceHealth.financeSources
    };
};
