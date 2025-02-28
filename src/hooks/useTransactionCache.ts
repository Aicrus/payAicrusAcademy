import { useState, useEffect } from 'react';

const TRANSACTION_CACHE_KEY = 'currentTransaction';

interface TransactionMetaData {
  email?: string;
  whatsapp?: string;
  produto?: {
    preco: number;
  };
  parcelas?: number;
}

interface TransactionData {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paymentId?: string;
  metaData: TransactionMetaData;
}

export function useTransactionCache() {
  const [transaction, setTransaction] = useState<TransactionData | null>(null);

  // Carregar transação do cache ao montar o componente
  useEffect(() => {
    const cached = localStorage.getItem(TRANSACTION_CACHE_KEY);
    if (cached) {
      try {
        setTransaction(JSON.parse(cached));
      } catch (error) {
        console.error('Erro ao carregar transação do cache:', error);
        localStorage.removeItem(TRANSACTION_CACHE_KEY);
      }
    }
  }, []);

  // Salvar transação no cache
  const saveTransaction = (transaction: TransactionData) => {
    try {
      localStorage.setItem(TRANSACTION_CACHE_KEY, JSON.stringify(transaction));
      setTransaction(transaction);
    } catch (error) {
      console.error('Erro ao salvar transação no cache:', error);
    }
  };

  // Atualizar transação no cache
  const updateTransaction = (data: Partial<TransactionData>) => {
    if (transaction) {
      const updated = {
        ...transaction,
        ...data
      };
      saveTransaction(updated);
    }
  };

  // Limpar transação do cache
  const clearTransaction = () => {
    localStorage.removeItem(TRANSACTION_CACHE_KEY);
    setTransaction(null);
  };

  return {
    transaction,
    saveTransaction,
    updateTransaction,
    clearTransaction,
    hasPendingTransaction: !!transaction && transaction.status === 'PENDING'
  };
} 