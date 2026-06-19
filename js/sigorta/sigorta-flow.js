import { SIGORTA_STEP_DEFS } from './sigorta-config.js';

const TYPE_FLOW = {
  arac: {
    riskStep: {
      title: 'Araç sigortası risk algınız',
      subtitle: 'Trafik, kasko ve sorumluluk teminat derinliği bu tercihe göre ayarlanır.'
    },
    budgetStep: {
      title: 'Araç sigortası prim bütçesi',
      subtitle: 'Yıllık prim ile teminat dengesi araç profilinize göre hesaplanır.'
    },
    riskValues: ['dusuk', 'orta', 'yuksek'],
    budgetValues: ['dusuk', 'orta', 'yuksek'],
    usageValues: ['ozel', 'ticari'],
    vehicleCategoryValues: ['otomobil', 'motosiklet', 'ticari_arac']
  },
  konut: {
    riskStep: {
      title: 'Konut sigortası risk algınız',
      subtitle: 'DASK, yangın ve eşya teminat kapsamı bu tercihe göre belirlenir.'
    },
    budgetStep: {
      title: 'Konut sigortası prim bütçesi',
      subtitle: 'Bina ve eşya değerine göre prim bandı önerilir.'
    },
    propertyRoleValues: ['malik', 'kiraci'],
    residentsCountValues: ['1', '2', '3', '4plus']
  },
  saglik: {
    riskStep: {
      title: 'Sağlık sigortası koruma seviyesi',
      subtitle: 'Yatarak/ayakta tedavi ve network kapsamı risk tercihinize bağlıdır.'
    },
    budgetStep: {
      title: 'Sağlık sigortası prim bütçesi',
      subtitle: 'Yaş grubu ve bakmakla yükümlü kişi sayısına göre prim bandı.'
    },
    childrenValues: ['0', '1', '2', '3plus']
  },
  seyahat: {
    riskStep: {
      title: 'Seyahat sigortası koruma seviyesi',
      subtitle: 'İptal, sağlık ve bagaj teminatları destinasyona göre değişir.'
    },
    budgetStep: {
      title: 'Seyahat sigortası prim bütçesi',
      subtitle: 'Süre ve kişi sayısına göre paket ekonomisi hesaplanır.'
    },
    destinationValues: ['yurtici', 'yurtdisi', 'schengen'],
    travelerCountValues: ['1', '2', '3', '4plus']
  }
};

function flowForType(type) {
  return TYPE_FLOW[type] || null;
}

function pickOptions(allOptions, allowedValues) {
  if (!allowedValues?.length) return allOptions;
  const byValue = new Map(allOptions.map((o) => [o.value, o]));
  return allowedValues.map((value) => byValue.get(value)).filter(Boolean);
}

export function getSigortaStepMeta(insuranceType, step) {
  const flow = flowForType(insuranceType);
  if (!flow || !step?.id) return {};
  const key = `${step.id}Step`;
  return flow[key] || {};
}

export function getSigortaOptions(field, insuranceType, allOptions) {
  const flow = flowForType(insuranceType);
  const options = allOptions[field] || [];
  if (!flow) return options;

  const map = {
    usage_type: flow.usageValues,
    vehicle_category: flow.vehicleCategoryValues,
    property_role: flow.propertyRoleValues,
    residents_count: flow.residentsCountValues,
    children_count: flow.childrenValues,
    destination_type: flow.destinationValues,
    traveler_count: flow.travelerCountValues,
    risk_perception: flow.riskValues,
    budget_level: flow.budgetValues
  };

  return pickOptions(options, map[field]);
}

export function enrichSigortaSteps(insuranceType, steps) {
  return steps.map((step) => ({
    ...step,
    ...getSigortaStepMeta(insuranceType, step)
  }));
}
