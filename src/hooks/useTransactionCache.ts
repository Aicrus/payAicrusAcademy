import { useState, useEffect } from 'react';
import type { Transaction } from '@/types/transaction';

const TRANSACTION_CACHE_KEY = 'currentTransaction';

interface TransactionData {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paymentId?: string;
}

export function useTransactionCache(userId: string | undefined) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchTransaction = async () => {
      try {
        const response = await fetch(`/api/transactions/pending/${userId}`);
        if (!response.ok) {
          throw new Error('Falha ao buscar transação');
        }
        const data = await response.json();
        setTransaction(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [userId]);

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
    hasPendingTransaction: !!transaction && transaction.status === 'PENDING',
    loading,
    error
  };
} 