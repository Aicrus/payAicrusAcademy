import { supabase } from '@/lib/supabase';
import type { Transaction } from '@/types/transaction';

interface TransactionData {
  amount: number;
  status: string;
  paymentMethod: string;
  userId: string;
  productId: string;
  idCustomerAsaas: string;
  metaData: {
    email: string;
    whatsapp: string;
    produto: {
      preco: number;
    };
    parcelas?: number;
  };
}

interface TransactionUpdateData {
  valor?: number;
  produto?: string;
  paymentMethod?: string;
  idPayAsaas?: string;
  metaData?: Record<string, unknown>;
}

const TRANSACTION_CACHE_KEY = 'currentTransaction';

export class TransactionService {
  static async createTransaction(data: TransactionData): Promise<Transaction> {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar transação');
      }

      return response.json();
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      throw error;
    }
  }

  static async updateTransaction(id: string, data: TransactionUpdateData): Promise<Transaction> {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar transação');
      }

      return response.json();
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      throw error;
    }
  }

  static async getTransactionById(id: number) {
    try {
      const response = await fetch(`/api/transactions/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar transação');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar transação:', error);
      throw error;
    }
  }

  static async getPendingTransactionByUserId(userId: number) {
    try {
      const response = await fetch(`/api/transactions/pending/${userId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar transação pendente');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar transação pendente:', error);
      throw error;
    }
  }

  static getFromCache(): Transaction | null {
    try {
      const cached = localStorage.getItem(TRANSACTION_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Erro ao recuperar transação do cache:', error);
      return null;
    }
  }

  static async finalizeTransaction(id: string): Promise<Transaction> {
    try {
      const response = await fetch(`/api/transactions/${id}/finalize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Falha ao finalizar transação');
      }

      return response.json();
    } catch (error) {
      console.error('Erro ao finalizar transação:', error);
      throw error;
    }
  }
} 