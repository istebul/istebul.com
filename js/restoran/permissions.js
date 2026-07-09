export const RESTAURANT_PERMISSIONS = {
  owner: [
    'settings.manage',
    'billing.manage',
    'users.manage',
    'products.manage',
    'orders.manage'
  ],

  manager: [
    'products.manage',
    'orders.manage'
  ],

  staff: [
    'orders.manage'
  ]
};


export function hasRestaurantPermission(role, permission) {
  const permissions = RESTAURANT_PERMISSIONS[role] || [];

  return permissions.includes(permission);
}


export function requireRestaurantPermission(role, permission) {
  if (!hasRestaurantPermission(role, permission)) {
    throw new Error('Yetkiniz bulunmuyor');
  }

  return true;
}
