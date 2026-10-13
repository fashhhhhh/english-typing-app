import { createContext, ReactNode, useContext, useMemo } from 'react';
import { LocalStorageProvider } from './localProvider';
import { StorageProvider } from './types';

const StorageContext = createContext<StorageProvider | null>(null);

/**
 * 依赖注入入口：当前注入 LocalStorageProvider；
 * 未来接入后端时仅需在此处改为 HttpProvider。
 */
export function StorageProviderRoot({ children }: { children: ReactNode }) {
  const provider = useMemo<StorageProvider>(() => new LocalStorageProvider(), []);
  return <StorageContext.Provider value={provider}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageProvider {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage 必须在 StorageProviderRoot 内使用');
  return ctx;
}
