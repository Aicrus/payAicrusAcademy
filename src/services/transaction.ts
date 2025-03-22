import { supabase } from '@/lib/supabase';

export interface TransactionMetaData {
  cpf?: string;
  name?: string;
  email?: string;
  asaasId?: string;
  dialCode?: string;
  whatsapp?: string;
  produto?: {
    valor: number;
  };
  valorAtualizado?: boolean;
  // Campos específicos do PIX
  statusAsaas?: string;
  valorPago?: number;
  dataPagamento?: string | null;
  dataConfirmacao?: string | null;
}

export interface Transaction {
  id: number;
  created_at: string;
  valor: number;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH';
  dataHora: string;
  metodoPagamento: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  idCustomerAsaas: string;
  idPayAsaas: string;
  users: number;
  produto: number;
  metaData: TransactionMetaData;
}

const TRANSACTION_CACHE_KEY = 'currentTransaction';

export interface TransactionData {
  id?: string;
  users: number;
  produto: number;
  amount?: number;
  valor?: number;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH';
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  metodoPagamento?: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  idPayAsaas?: string;
  idCustomerAsaas?: string;
  dataHora?: string;
  metaData?: TransactionMetaData;
}

export class TransactionService {
  static async createTransaction(data: TransactionData) {
    try {
      // Mapear campos da nova estrutura para a antiga
      const mappedData = {
        valor: data.valor || data.amount,
        status: data.status,
        metodoPagamento: data.metodoPagamento || data.paymentMethod,
        users: data.users,
        produto: data.produto,
        idCustomerAsaas: data.idCustomerAsaas,
        metaData: data.metaData || {}
      };

      console.log('Enviando dados mapeados para criação:', mappedData);

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar transação');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      throw error;
    }
  }

  static async updateTransaction(id: string, data: Partial<TransactionData>) {
    try {
      // Mapear campos da nova estrutura para a antiga
      const mappedData = {
        valor: data.valor || data.amount,
        metodoPagamento: data.metodoPagamento || data.paymentMethod,
        produto: data.produto,
        idPayAsaas: data.idPayAsaas,
        idCustomerAsaas: data.idCustomerAsaas,
        metaData: data.metaData,
        status: data.status
      };

      console.log('Enviando requisição de atualização:', {
        id,
        data: mappedData,
        url: `/api/transactions/${id}`
      });

      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Resposta de erro da API:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.error || 'Falha ao atualizar a transação');
      }

      const result = await response.json();
      console.log('Resposta de sucesso:', result);
      return result;
    } catch (error) {
      console.error('Erro completo na atualização:', error);
      throw error instanceof Error ? error : new Error('Erro ao atualizar a transação');
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

  static clearCache(): void {
    try {
      localStorage.removeItem(TRANSACTION_CACHE_KEY);
      console.log('Cache de transação limpo com sucesso');
    } catch (error) {
      console.error('Erro ao limpar cache de transação:', error);
    }
  }

  static async finalizeTransaction(id: number) {
    try {
      const response = await fetch(`/api/transactions/finalize/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao finalizar transação');
      }

      // Limpar cache após finalizar
      localStorage.removeItem(TRANSACTION_CACHE_KEY);

      return await response.json();
    } catch (error) {
      console.error('Erro ao finalizar transação:', error);
      throw error;
    }
  }
} 