import { supabase } from '@/lib/supabase';

interface Transaction {
  id: number;
  created_at: string;
  valor: number;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH';
  dataHora: string;
  metodoPagamento: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  idCustomerAsaas: string;
  idPayAsaas: string;
  users: number;
  produto: number; // ID do produto na tabela produtosAicrusAcademy
  metaData: Record<string, any>;
}

const TRANSACTION_CACHE_KEY = 'currentTransaction';

interface TransactionData {
  valor: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  metodoPagamento: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  idCustomerAsaas: string;
  users: number;
  produto: number; // ID do produto na tabela produtosAicrusAcademy
  metaData?: Record<string, any>;
  idPayAsaas?: string;
}

export class TransactionService {
  static async createTransaction(data: TransactionData) {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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

  static async updateTransaction(id: number, data: Partial<TransactionData>) {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar transação');
      }

      return await response.json();
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

  static async finalizeTransaction(id: number) {
    try {
      // Primeiro, buscar os dados da transação
      const { data: transaction, error: fetchError } = await supabase
        .from('transacoes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Erro ao buscar transação: ${fetchError.message}`);
      }

      // Verificar se já existe uma compra ativa para este usuário e produto
      const { data: existingPurchase, error: purchaseError } = await supabase
        .from('comprasUser')
        .select('*')
        .eq('users', transaction.users)
        .eq('produto', transaction.produto)
        .eq('statusAcesso', 'ativo')
        .single();

      const dataInicio = new Date();
      // Definir data de fim como 1 ano após o início
      const dataFim = new Date(dataInicio);
      dataFim.setFullYear(dataFim.getFullYear() + 1);

      if (existingPurchase) {
        // Atualizar a data de fim da compra existente
        const { error: updateError } = await supabase
          .from('comprasUser')
          .update({
            dataFim: dataFim.toISOString(),
            transacao: id,
            ultimaAtualizacao: new Date().toISOString()
          })
          .eq('id', existingPurchase.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar compra: ${updateError.message}`);
        }
      } else {
        // Criar nova compra
        const { error: insertError } = await supabase
          .from('comprasUser')
          .insert({
            users: transaction.users,
            produto: transaction.produto,
            transacao: id,
            dataInicio: dataInicio.toISOString(),
            dataFim: dataFim.toISOString(),
            statusAcesso: 'ativo',
            ultimaAtualizacao: new Date().toISOString()
          });

        if (insertError) {
          throw new Error(`Erro ao criar compra: ${insertError.message}`);
        }
      }

      // Atualizar status da transação
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CONFIRMED',
          dataHora: new Date().toISOString()
        }),
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