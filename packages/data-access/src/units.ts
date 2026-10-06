import { LBS_PER_KG } from './goals';

// Canonical storage is lb / in / mm. These convert only for display and input
// (#75); switching systems never changes a stored value.

export const CM_PER_IN = 2.54;

export type UnitSystem = 'imperial' | 'metric';

export const toDisplayWeight = (lb: number, u: UnitSystem): number =>
  u === 'imperial' ? lb : lb / LBS_PER_KG;

export const fromDisplayWeight = (v: number, u: UnitSystem): number =>
  u === 'imperial' ? v : v * LBS_PER_KG;

export const toDisplayLength = (inches: number, u: UnitSystem): number =>
  u === 'imperial' ? inches : inches * CM_PER_IN;

export const fromDisplayLength = (v: number, u: UnitSystem): number =>
  u === 'imperial' ? v : v / CM_PER_IN;
