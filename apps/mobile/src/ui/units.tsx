import { createContext, use, type ReactNode } from 'react';
import type { UnitSystem } from '@leanlog/data-access';

const UnitsContext = createContext<UnitSystem>('imperial');

// Display-only unit system: stored values stay in lb / in either way.
export function UnitsProvider({
  unitSystem,
  children,
}: {
  unitSystem: UnitSystem;
  children: ReactNode;
}) {
  return <UnitsContext.Provider value={unitSystem}>{children}</UnitsContext.Provider>;
}

export function useUnitSystem(): UnitSystem {
  return use(UnitsContext);
}
