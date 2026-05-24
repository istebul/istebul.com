/**
 * Marketplace listing ownership estimate (simplified).
 * For Auto funnel vehicle-specific costs see `js/auto/auto-cost-engine.js` (truth layer).
 */
export function estimateVehicleOwnershipCost(price, profile = {}) {
    const purchasePrice = Number(price || 0);

    const fuelCost =
        profile.electricEnergyCost ||
        profile.hybridFuelCost ||
        profile.gasolineFuelCost ||
        60000;

    const kasko = Math.round(purchasePrice * (profile.insuranceStandardRate || 0.02));
    const traffic = Number(profile.trafficInsuranceBase || 12000);
    const maintenance = Number(profile.maintenanceStandard || 18000);
    const mtv = purchasePrice > 2000000 ? 42000 : purchasePrice > 1000000 ? 26000 : 14000;
    const depreciation = Math.round(purchasePrice * 0.08);

    const total =
        fuelCost +
        kasko +
        traffic +
        maintenance +
        mtv +
        depreciation;

    return {
        total,
        monthly: Math.round(total / 12),
        breakdown: {
            fuelCost,
            kasko,
            traffic,
            maintenance,
            mtv,
            depreciation
        }
    };
}

export function estimateHomeOwnershipCost(price, profile = {}) {
    const purchasePrice = Number(price || 0);

    const insurance = Math.round(purchasePrice * (profile.insuranceRate || 0.0032));
    const propertyTax = Math.round(purchasePrice * (profile.propertyTaxRate || 0.002));
    const dues = Number(profile.apartmentDues || 36000);
    const renewal = Number(profile.apartmentRenewal || 18000);
    const reserve = Math.round(purchasePrice * 0.004);

    const total =
        insurance +
        propertyTax +
        dues +
        renewal +
        reserve;

    return {
        total,
        monthly: Math.round(total / 12),
        breakdown: {
            insurance,
            propertyTax,
            dues,
            renewal,
            reserve
        }
    };
}

export function estimateVacationTotalCost(price, profile = {}) {
    const packagePrice = Number(price || 0);

    const transport = Math.round(packagePrice * (profile.transportRatio || 0.2));
    const activities = Math.round(packagePrice * (profile.activityRatio || 0.12));
    const insurance = Math.round(packagePrice * (profile.insuranceRatio || 0.06));
    const foodExtras = Math.round(packagePrice * 0.1);

    const total =
        transport +
        activities +
        insurance +
        foodExtras;

    return {
        total,
        monthly: total,
        breakdown: {
            transport,
            activities,
            insurance,
            foodExtras
        }
    };
}

export function estimateListingPeriodicCost(listing = {}, profile = {}) {
    if (listing.category === 'arac') {
        return estimateVehicleOwnershipCost(listing.price, profile);
    }

    if (listing.category === 'ev') {
        return estimateHomeOwnershipCost(listing.price, profile);
    }

    if (listing.category === 'tatil') {
        return estimateVacationTotalCost(listing.price, profile);
    }

    return {
        total: Math.round(Number(listing.price || 0) * 0.05),
        monthly: 0,
        breakdown: {}
    };
}
