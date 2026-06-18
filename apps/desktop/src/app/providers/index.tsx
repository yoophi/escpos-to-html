import type { ReactNode } from 'react';

/**
 * 전역 프로바이더 컴포지터. 향후 ThemeProvider, QueryClientProvider 등을 합성한다.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
