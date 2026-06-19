import { KASKO_OPTIONS } from './kasko-config.js';

function pickOptions(allOptions, allowedValues) {
  if (!allowedValues?.length) return allOptions;
  const byValue = new Map(allOptions.map((o) => [o.value, o]));
  return allowedValues.map((value) => byValue.get(value)).filter(Boolean);
}

export function getKaskoOptions(field, state = {}) {
  const options = KASKO_OPTIONS[field] || [];
  if (field === 'vehicle_category') {
    if (state.usage_type === 'ticari') {
      return pickOptions(options, ['ticari_arac']);
    }
    if (state.usage_type === 'ozel') {
      return pickOptions(options, ['otomobil', 'suv']);
    }
  }
  if (field === 'coverage_level' && state.usage_type === 'ticari') {
    return pickOptions(options, ['standard', 'full']);
  }
  return options;
}

export function getKaskoStepMeta(state, step) {
  if (!step?.id) return {};
  if (step.id === 'driver' && state.usage_type === 'ticari') {
    return {
      title: 'Ticari kullanım ve sürücü profili',
      subtitle: 'İş kullanımı prim bandı ve teminat limitleri buna göre modellenir.'
    };
  }
  if (step.id === 'coverage' && state.usage_type === 'ticari') {
    return {
      title: 'Ticari kasko teminat seviyesi',
      subtitle: 'İşletme araçları için mini kasko genelde önerilmez; standart veya geniş paket seçin.'
    };
  }
  return {};
}

export function resetKaskoFieldsOnUsageChange(state, previousUsage, newUsage) {
  if (previousUsage === newUsage) return;
  const allowed = getKaskoOptions('vehicle_category', state).map((o) => o.value);
  if (state.vehicle_category && !allowed.includes(state.vehicle_category)) {
    state.vehicle_category = '';
  }
  const coverageAllowed = getKaskoOptions('coverage_level', state).map((o) => o.value);
  if (state.coverage_level && !coverageAllowed.includes(state.coverage_level)) {
    state.coverage_level = '';
  }
}
