import { createContext, use, type PropsWithChildren } from 'react';
import { useCreateStore } from './state/useCreateStore';
import type { Store } from './state/types';

export type { EnsureDayResult, Store } from './state/types';

const Ctx = createContext<Store | null>(null);

export function StateProvider({ children }: PropsWithChildren) {
  const store = useCreateStore();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = use(Ctx);
  if (!ctx) throw new Error('useStore must be used within StateProvider');
  return ctx;
}
