import { useState, useEffect } from 'react';

const TRANSACTION_CACHE_KEY = 'currentTransaction';

interface Transaction {
  id: number;
  valor: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  metodoPagamento: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  idCustomerAsaas: string;
  idPayAsaas?: string;
  metaData?: Record<string, any>;
}

export function useTransactionCache() {
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);

  // Carregar transação do cache ao montar o componente
  useEffect(() => {
    const cached = localStorage.getItem(TRANSACTION_CACHE_KEY);
    if (cached) {
      try {
        setCurrentTransaction(JSON.parse(cached));
      } catch (error) {
        console.error('Erro ao carregar transação do cache:', error);
        localStorage.removeItem(TRANSACTION_CACHE_KEY);
      }
    }
  }, []);

  // Salvar transação no cache
  const saveTransaction = (transaction: Transaction) => {
    try {
      localStorage.setItem(TRANSACTION_CACHE_KEY, JSON.stringify(transaction));
      setCurrentTransaction(transaction);
    } catch (error) {
      console.error('Erro ao salvar transação no cache:', error);
    }
  };

  // Atualizar transação no cache
  const updateTransaction = (data: Partial<Transaction>) => {
    if (currentTransaction) {
      const updated = {
        ...currentTransaction,
        ...data
      };
      saveTransaction(updated);
    }
  };

  // Limpar transação do cache
  const clearTransaction = () => {
    localStorage.removeItem(TRANSACTION_CACHE_KEY);
    setCurrentTransaction(null);
  };

  return {
    currentTransaction,
    saveTransaction,
    updateTransaction,
    clearTransaction,
    hasPendingTransaction: !!currentTransaction && currentTransaction.status === 'PENDING'
  };
} 