export interface FeatureFlags {
  pos_sales: boolean;
  basic_inventory: boolean;
  single_branch: boolean;
  basic_reports: boolean;
  multi_branch: boolean;
  tax_officer_mode: boolean;
  advanced_reports: boolean;
  staff_management: boolean;
  api_access: boolean;
}

export type PlanName = 'starter' | 'business' | 'enterprise';

const STARTER_FEATURES: FeatureFlags = {
  pos_sales: true,
  basic_inventory: true,
  single_branch: true,
  basic_reports: true,
  multi_branch: false,
  tax_officer_mode: false,
  advanced_reports: false,
  staff_management: false,
  api_access: false,
};

export const PLAN_FEATURES: Record<PlanName, FeatureFlags> = {
  starter: STARTER_FEATURES,
  business: {
    ...STARTER_FEATURES,
    multi_branch: true,
    staff_management: true,
    advanced_reports: true,
    tax_officer_mode: false,
    api_access: false,
  },
  enterprise: {
    ...STARTER_FEATURES,
    multi_branch: true,
    staff_management: true,
    advanced_reports: true,
    tax_officer_mode: true,
    api_access: true,
  },
};

export const FEATURE_FLAG_KEYS = Object.freeze(
  Object.keys(PLAN_FEATURES.starter) as Array<keyof FeatureFlags>,
);

export function isFeatureFlagKey(value: string): value is keyof FeatureFlags {
  return FEATURE_FLAG_KEYS.includes(value as keyof FeatureFlags);
}

export function isPlanName(value: string): value is PlanName {
  return Object.prototype.hasOwnProperty.call(PLAN_FEATURES, value);
}
