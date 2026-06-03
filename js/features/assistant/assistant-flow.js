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
  tatil: ['destination', 'travelers', 'priority']
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
