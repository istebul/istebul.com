/**
 * Ana sayfa Karar Asistanı — kategori ve çatal soru (fork) bazlı akış.
 * Dikey sayfalardaki *-flow.js modülleriyle aynı mantık.
 */

const LOCATION_IDS = new Set(['province', 'district', 'carModel', 'vacationPlace']);
const FINANCE_IDS = new Set(['budget', 'priority']);

const CATEGORY_FLOW = {
  arac: {
    fork: 'usage',
    profileStep: {
      label: 'Kullanım profili',
      description: 'Aracı nasıl kullanacağınızı seçin; sonraki sorular buna göre açılır.'
    },
    needsStep: (answers) => ({
      description:
        answers.usage === 'family'
          ? 'Aile kullanımı için kasa, yakıt ve maliyet önceliklerinizi netleştirin.'
          : answers.usage === 'city'
            ? 'Şehir içi kullanım için düşük tüketim ve pratik kasa tercihleri öne çıkar.'
            : answers.usage === 'longRoad'
              ? 'Uzun yol için yakıt menzili ve konfor odaklı seçenekler filtrelenir.'
              : 'Konfor ve prestij odaklı araç profilinizi tamamlayın.'
    }),
    forks: {
      city: {
        fuel: ['hybrid', 'electric', 'gasoline'],
        body: ['hatchback', 'sedan'],
        priority: ['lowCost', 'safety', 'comfort']
      },
      family: {
        fuel: ['hybrid', 'gasoline', 'diesel'],
        body: ['suv', 'mpv', 'sedan'],
        priority: ['safety', 'lowCost', 'resale', 'comfort']
      },
      longRoad: {
        fuel: ['diesel', 'gasoline', 'hybrid'],
        body: ['sedan', 'suv'],
        priority: ['lowCost', 'resale', 'comfort']
      },
      prestige: {
        fuel: ['gasoline', 'hybrid'],
        body: ['suv', 'sedan'],
        priority: ['comfort', 'safety', 'resale']
      }
    }
  },
  ev: {
    fork: 'purpose',
    profileStep: {
      label: 'Konut amacı',
      description: 'Satın alma, kira veya yatırım hedefinize göre soru seti değişir.'
    },
    needsStep: (answers) => ({
      description:
        answers.purpose === 'investment'
          ? 'Yatırım için konut tipi, lokasyon ve getiri önceliklerinizi belirleyin.'
          : answers.purpose === 'seasonal'
            ? 'Sezonluk kullanım için yazlık ve sahil odaklı seçenekler öne çıkar.'
            : answers.purpose === 'premium'
              ? 'Prestij ve yaşam konforu odaklı konut profilinizi tamamlayın.'
              : 'Yaşam amaçlı konut tipi ve lokasyon tercihlerinizi netleştirin.'
    }),
    forks: {
      live: {
        propertyType: ['daire', 'mustakil', 'yazlik'],
        location: ['central', 'quiet', 'coastal'],
        priority: ['lowMonthly', 'comfort', 'maintenance']
      },
      investment: {
        propertyType: ['daire', 'yazlik'],
        location: ['central', 'coastal', 'premiumArea'],
        priority: ['valueGrowth', 'lowMonthly', 'maintenance']
      },
      seasonal: {
        propertyType: ['yazlik', 'villa', 'mustakil'],
        location: ['coastal', 'quiet'],
        priority: ['comfort', 'valueGrowth', 'maintenance']
      },
      premium: {
        propertyType: ['villa', 'daire'],
        location: ['premiumArea', 'coastal', 'central'],
        priority: ['comfort', 'valueGrowth']
      }
    }
  },
  tatil: {
    fork: 'vacationType',
    profileStep: {
      label: 'Tatil tipi',
      description: 'Tatil konseptinizi seçin; rota ve grup soruları buna göre özelleşir.'
    },
    needsStep: (answers) => ({
      description:
        answers.vacationType === 'honeymoon'
          ? 'Balayı için rota ve çift profiline uygun öncelikleri seçin.'
          : answers.vacationType === 'familyResort'
            ? 'Aile resort tatili için grup yapısı ve paket önceliklerinizi belirleyin.'
            : answers.vacationType === 'culture'
              ? 'Kültür ve şehir gezisi için rota ve deneyim odaklı tercihler.'
              : 'Tatil profilinize uygun rota ve öncelikleri tamamlayın.'
    }),
    forks: {
      familyResort: {
        destination: ['mediterranean'],
        travelers: ['family', 'group'],
        priority: ['allInclusive', 'quiet', 'experience']
      },
      culture: {
        destination: ['europe', 'mediterranean'],
        travelers: ['solo', 'couple'],
        priority: ['experience', 'premium']
      },
      nature: {
        destination: ['blackSea', 'mediterranean'],
        travelers: ['solo', 'couple', 'family'],
        priority: ['quiet', 'experience']
      },
      luxury: {
        destination: ['island', 'mediterranean', 'europe'],
        travelers: ['couple', 'group'],
        priority: ['premium', 'quiet', 'allInclusive']
      },
      honeymoon: {
        destination: ['mediterranean', 'island'],
        travelers: ['couple'],
        priority: ['premium', 'quiet', 'allInclusive']
      }
    }
  },
  finansman: {
    fork: 'purpose',
    profileStep: {
      label: 'Finansman amacı',
      description: 'Kredi türüne göre vade, kapasite ve risk soruları özelleşir.'
    },
    needsStep: (answers) => ({
      description:
        answers.purpose === 'konut'
          ? 'Konut kredisi için uzun vade ve ödeme kapasitesi birlikte değerlendirilir.'
          : answers.purpose === 'arac'
            ? 'Taşıt kredisi için vade, faiz hassasiyeti ve aylık kapasite netleştirilir.'
            : answers.purpose === 'tatil'
              ? 'Tatil/seyahat finansmanı için kısa vade ve nakit akışı önceliklidir.'
              : answers.purpose === 'isletme'
                ? 'İşletme finansmanında nakit akışı ve erken kapama senaryoları öne çıkar.'
                : 'İhtiyaç kredisi için vade, kapasite ve faiz hassasiyetinizi belirleyin.'
    }),
    forks: {
      arac: {
        term: ['24', '36', '48', '60'],
        capacity: ['15k', '25k', '40k', '60k'],
        rateSensitivity: ['dusuk', 'orta', 'yuksek'],
        riskTolerance: ['muhafazakar', 'dengeli', 'agresif']
      },
      konut: {
        term: ['60', '120', '180', '240'],
        capacity: ['25k', '40k', '60k'],
        rateSensitivity: ['dusuk', 'orta', 'yuksek'],
        riskTolerance: ['muhafazakar', 'dengeli']
      },
      tatil: {
        term: ['12', '24', '36'],
        capacity: ['15k', '25k', '40k'],
        rateSensitivity: ['orta', 'yuksek'],
        riskTolerance: ['muhafazakar', 'dengeli']
      },
      ihtiyac: {
        term: ['12', '24', '36', '48'],
        capacity: ['15k', '25k', '40k', '60k'],
        rateSensitivity: ['dusuk', 'orta', 'yuksek'],
        riskTolerance: ['muhafazakar', 'dengeli', 'agresif']
      },
      isletme: {
        term: ['24', '36', '48', '60'],
        capacity: ['25k', '40k', '60k'],
        rateSensitivity: ['orta', 'yuksek'],
        riskTolerance: ['dengeli', 'agresif']
      }
    }
  },
  sigorta: {
    fork: 'insuranceType',
    profileStep: {
      label: 'Sigorta türü',
      description: 'Araç, konut, sağlık veya seyahat sigortası için soru seti özelleşir.'
    },
    needsStep: (answers) => ({
      description:
        answers.insuranceType === 'arac'
          ? 'Araç sigortasında kullanım, ehliyet ve risk profili prim bandını belirler.'
          : answers.insuranceType === 'konut'
            ? 'Konut sigortasında malik/kiracı durumu ve hane profili teminatı etkiler.'
            : answers.insuranceType === 'saglik'
              ? 'Sağlık sigortasında risk algısı ve bütçe bandı paket derinliğini belirler.'
              : answers.insuranceType === 'seyahat'
                ? 'Seyahat sigortasında rota, süre ve yolcu sayısı prim bandını şekillendirir.'
                : 'Sigorta profilinize uygun koruma seviyesini tamamlayın.'
    }),
    forks: {
      arac: {
        license_years: ['0-2', '3-10', '11plus'],
        usage_type: ['ozel', 'ticari'],
        risk_perception: ['dusuk', 'orta', 'yuksek'],
        budget_level: ['dusuk', 'orta', 'yuksek']
      },
      konut: {
        property_role: ['malik', 'kiraci'],
        risk_perception: ['dusuk', 'orta', 'yuksek'],
        budget_level: ['dusuk', 'orta', 'yuksek']
      },
      saglik: {
        risk_perception: ['dusuk', 'orta', 'yuksek'],
        budget_level: ['dusuk', 'orta', 'yuksek']
      },
      seyahat: {
        destination_type: ['yurtici', 'yurtdisi', 'schengen'],
        trip_duration: ['1-7', '8-15', '16plus'],
        risk_perception: ['dusuk', 'orta', 'yuksek'],
        budget_level: ['dusuk', 'orta', 'yuksek']
      }
    }
  },
  kasko: {
    fork: 'vehicle_category',
    profileStep: {
      label: 'Araç tipi',
      description: 'Otomobil, SUV veya ticari araç profiline göre teminat soruları açılır.'
    },
    needsStep: (answers) => ({
      description:
        answers.vehicle_category === 'ticari_arac'
          ? 'Ticari kullanımda onarım riski ve prim bandı daha yüksek modellenir.'
          : answers.vehicle_category === 'suv'
            ? 'SUV profillerinde cam, ikame araç ve mini onarım maddeleri öne çıkar.'
            : 'Kasko kapsam seviyesi ve araç yaşı prim/teminat dengesini belirler.'
    }),
    forks: {
      otomobil: {
        vehicle_year_band: ['0-3', '4-10', '11plus'],
        usage_type: ['ozel', 'ticari'],
        coverage_level: ['mini', 'standard', 'full'],
        risk_perception: ['dusuk', 'orta', 'yuksek'],
        budget_level: ['dusuk', 'orta', 'yuksek']
      },
      suv: {
        vehicle_year_band: ['0-3', '4-10', '11plus'],
        usage_type: ['ozel'],
        coverage_level: ['standard', 'full'],
        risk_perception: ['orta', 'yuksek'],
        budget_level: ['orta', 'yuksek']
      },
      motosiklet: {
        vehicle_year_band: ['0-3', '4-10', '11plus'],
        usage_type: ['ozel'],
        coverage_level: ['mini', 'standard'],
        risk_perception: ['orta', 'yuksek'],
        budget_level: ['dusuk', 'orta']
      },
      ticari_arac: {
        vehicle_year_band: ['0-3', '4-10', '11plus'],
        usage_type: ['ticari'],
        coverage_level: ['standard', 'full'],
        risk_perception: ['orta', 'yuksek'],
        budget_level: ['orta', 'yuksek']
      }
    }
  }
};

function flowForCategory(categoryId) {
  return CATEGORY_FLOW[categoryId] || null;
}

function pickOptions(options, allowedValues) {
  if (!allowedValues?.length || !Array.isArray(options)) return options;
  const allowed = new Set(allowedValues);
  return options.filter((opt) => allowed.has(opt.value));
}

function filterQuestionOptions(question, allowedValues) {
  if (!question?.options || !allowedValues) return question;
  const filtered = pickOptions(question.options, allowedValues);
  if (filtered.length === question.options.length) return question;
  return { ...question, options: filtered };
}

/**
 * Fork ve mevcut cevaplara göre soru seçeneklerini filtreler.
 */
export function applyAssistantQuestionFlow(categoryId, questions, answers = {}) {
  const flow = flowForCategory(categoryId);
  if (!flow || !Array.isArray(questions)) return questions;

  const forkValue = answers[flow.fork];
  const forkRules = forkValue ? flow.forks[forkValue] : null;

  return questions.map((question) => {
    if (!forkRules) return question;
    const allowed = forkRules[question.id];
    return allowed ? filterQuestionOptions(question, allowed) : question;
  });
}

const FORK_RESET_FIELDS = {
  arac: ['fuel', 'body', 'priority'],
  ev: ['propertyType', 'location', 'priority'],
  tatil: ['destination', 'travelers', 'priority'],
  finansman: ['term', 'capacity', 'rateSensitivity', 'riskTolerance'],
  sigorta: ['license_years', 'usage_type', 'property_role', 'destination_type', 'trip_duration', 'risk_perception', 'budget_level'],
  kasko: ['vehicle_year_band', 'usage_type', 'coverage_level', 'risk_perception', 'budget_level']
};

/**
 * Çatal soru değişince uyumsuz cevapları temizler.
 */
export function resetAssistantAnswersOnForkChange(categoryId, answers, forkField, previousForkValue) {
  const flow = flowForCategory(categoryId);
  if (!flow || forkField !== flow.fork) return answers;

  const next = { ...answers };
  const fields = FORK_RESET_FIELDS[categoryId] || [];

  fields.forEach((fieldId) => {
    const questionRules = flow.forks[next[flow.fork]];
    if (!questionRules) {
      next[fieldId] = '';
      return;
    }
    const allowed = questionRules[fieldId];
    if (!allowed) return;
    if (next[fieldId] && !allowed.includes(next[fieldId])) {
      next[fieldId] = '';
    }
  });

  if (categoryId === 'tatil' && next.vacationType === 'honeymoon') {
    next.travelers = 'couple';
  }

  return next;
}

export function getAssistantForkField(categoryId) {
  return flowForCategory(categoryId)?.fork || null;
}

export function isAssistantForkField(categoryId, fieldName) {
  return getAssistantForkField(categoryId) === fieldName;
}

/**
 * Konum → profil (çatal) → detay → bütçe adımları.
 */
export function buildAssistantWizardSteps(categoryId, categoryConfig, answers = {}) {
  if (!categoryConfig?.questions?.length) return [];

  const flow = flowForCategory(categoryId);
  const questions = applyAssistantQuestionFlow(categoryId, categoryConfig.questions, answers);
  const forkId = flow?.fork;

  const locationQuestions = questions.filter((q) => LOCATION_IDS.has(q.id));
  const financeQuestions = questions.filter((q) => FINANCE_IDS.has(q.id));
  const forkQuestion = forkId ? questions.find((q) => q.id === forkId) : null;
  const detailQuestions = questions.filter(
    (q) => !LOCATION_IDS.has(q.id) && !FINANCE_IDS.has(q.id) && q.id !== forkId
  );

  const steps = [
    {
      id: 'location',
      label: 'Konum ve kapsam',
      eyebrow: '1. adım',
      description: 'Önce il seçin; ilçe ve opsiyonel tercih alanları boş bırakılabilir.',
      questions: locationQuestions
    }
  ];

  if (forkQuestion) {
    steps.push({
      id: 'profile',
      label: flow.profileStep?.label || 'Profil',
      eyebrow: '2. adım',
      description: flow.profileStep?.description || 'Karar profilinizi netleştirin.',
      questions: [forkQuestion]
    });
  }

  const needsMeta =
    typeof flow?.needsStep === 'function' ? flow.needsStep(answers) : { description: '' };

  steps.push({
    id: 'needs',
    label: 'İhtiyaç detayları',
    eyebrow: forkQuestion ? '3. adım' : '2. adım',
    description:
      needsMeta.description ||
      'Kullanım amacını, beklentileri ve karar kriterlerini netleştirin.',
    questions: detailQuestions
  });

  steps.push({
    id: 'finance',
    label: 'Bütçe ve maliyet',
    eyebrow: forkQuestion ? '4. adım' : '3. adım',
    description: 'Serbest bütçe girin; sistem toplam maliyet ve kredi yükünü birlikte hesaplar.',
    questions: financeQuestions
  });

  return steps.filter((step) => step.questions.length > 0);
}
