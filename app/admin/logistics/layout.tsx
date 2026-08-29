import type { ReactNode } from 'react';
import AutoNimbusSync from './AutoNimbusSync';

export default function LogisticsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AutoNimbusSync />
    </>
  );
}
