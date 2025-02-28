'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Produto } from '@/types/produto';

interface ProdutoContextData {
  produto: Produto | null;
}

const ProdutoContext = createContext<ProdutoContextData>({
  produto: null,
});

interface ProdutoProviderProps {
  children: ReactNode;
  produto: Produto | null;
}

export function ProdutoProvider({ children, produto }: ProdutoProviderProps) {
  return (
    <ProdutoContext.Provider value={{ produto }}>
      {children}
    </ProdutoContext.Provider>
  );
}

export function useProduto() {
  const context = useContext(ProdutoContext);

  if (!context) {
    throw new Error('useProduto must be used within a ProdutoProvider');
  }

  return context;
} 