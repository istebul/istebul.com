export const RESTAURANT_PLANS = {
  free: {
    branches: 1,
    users: 2,
    ordersPerMonth: 50,
    whatsappAI: false,
    analytics: false
  },

  starter: {
    branches: 1,
    users: 5,
    ordersPerMonth: 1000,
    whatsappAI: true,
    analytics: false
  },

  pro: {
    branches: 10,
    users: 100,
    ordersPerMonth: 50000,
    whatsappAI: true,
    analytics: true
  },

  enterprise: {
    branches: Infinity,
    users: Infinity,
    ordersPerMonth: Infinity,
    whatsappAI: true,
    analytics: true
  }
};


export function getRestaurantPlanLimits(plan = 'free') {
  return RESTAURANT_PLANS[plan] || RESTAURANT_PLANS.free;
}


export function canUseFeature(plan, feature) {
  const limits = getRestaurantPlanLimits(plan);

  return Boolean(limits[feature]);
}


export function isWithinLimit(plan, key, currentValue) {
  const limits = getRestaurantPlanLimits(plan);

  return currentValue < limits[key];
}
