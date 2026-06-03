/** Kullanım amacına göre araç sihirbazı seçenek filtreleri */

const USAGE_FLOW = {
  family: {
    bodyValues: ['suv', 'sedan'],
    fuelValues: ['any', 'hybrid', 'gasoline'],
    kmValues: ['8000', '15000', '28000', 'custom'],
    cityRatioValues: ['0.6', '0.85']
  },
  city: {
    bodyValues: ['hatchback', 'sedan'],
    fuelValues: ['any', 'hybrid', 'electric', 'gasoline'],
    kmValues: ['8000', '15000', 'custom'],
    cityRatioValues: ['0.85', '0.6']
  },
  long: {
    bodyValues: ['sedan', 'suv'],
    fuelValues: ['diesel', 'gasoline', 'hybrid', 'any'],
    kmValues: ['15000', '28000', '40000', 'custom'],
    cityRatioValues: ['0.25', '0.6']
  },
  business: {
    bodyValues: ['sedan', 'suv'],
    fuelValues: ['diesel', 'gasoline', 'hybrid'],
    kmValues: ['28000', '40000', 'custom'],
    cityRatioValues: ['0.6', '0.25']
  }
};

function pickByValue(options, allowedValues) {
  if (!allowedValues?.length) return options;
  const byValue = new Map(options.map((o) => [o.value, o]));
  return allowedValues.map((v) => byValue.get(v)).filter(Boolean);
}

export function getAutoPartOptions(partKey, usage, allOptions) {
  const flow = USAGE_FLOW[usage];
  if (!flow || !allOptions?.length) return allOptions;

  const map = {
    body: flow.bodyValues,
    fuel: flow.fuelValues,
    km: flow.kmValues,
    city_ratio: flow.cityRatioValues
  };

  return pickByValue(allOptions, map[partKey]) || allOptions;
}

export function getAutoStepCopy(stepIndex, usage) {
  if (stepIndex === 1 && usage === 'family') {
    return {
      title: 'Aile kullanımına uygun araç tipi ve yakıt',
      description: 'Geniş hacim ve güvenlik önceliğinize göre kasa ve yakıt önerilir.'
    };
  }
  if (stepIndex === 1 && usage === 'city') {
    return {
      title: 'Şehir içi kullanım için kasa ve yakıt',
      description: 'Park, manevra ve düşük tüketim odaklı seçenekler öne çıkar.'
    };
  }
  if (stepIndex === 1 && usage === 'long') {
    return {
      title: 'Uzun yol için konfor ve yakıt',
      description: 'Sürüş stabilitesi ve yakıt verimliliği önceliklendirilir.'
    };
  }
  if (stepIndex === 1 && usage === 'business') {
    return {
      title: 'İş kullanımı için araç profili',
      description: 'Prestij, verim ve yoğun km profiline uygun seçenekler.'
    };
  }
  if (stepIndex === 2 && usage === 'long') {
    return {
      title: 'Uzun yol kilometre ve bölge',
      description: 'Yüksek yıllık km ve otoyol ağırlığı maliyet tahminini belirler.'
    };
  }
  return null;
}

export function sanitizeWizardStateForUsage(wizardState, optionPools) {
  if (!wizardState?.usage) return;
  ['body', 'fuel', 'km', 'city_ratio'].forEach((key) => {
    const pool = optionPools[key];
    if (!pool?.length || !wizardState[key]) return;
    const allowed = getAutoPartOptions(key, wizardState.usage, pool);
    if (!allowed.some((o) => o.value === wizardState[key])) {
      wizardState[key] = '';
    }
  });
}
