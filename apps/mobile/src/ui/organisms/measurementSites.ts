export const MEASUREMENT_SITES = [
  { key: 'shoulderIn', label: 'Shoulder' },
  { key: 'waistIn', label: 'Waist' },
  { key: 'bicepIn', label: 'Bicep' },
  { key: 'thighIn', label: 'Thigh' },
  { key: 'neckIn', label: 'Neck' },
  { key: 'hipIn', label: 'Hip' },
] as const;

export type SiteKey = (typeof MEASUREMENT_SITES)[number]['key'];
export type Measurements = Record<SiteKey, number | null>;
