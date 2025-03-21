import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { safeLog } from '@/utils/logger';

export async function GET(
  request: Request,
  context: any
) {
  try {
    const { userId } = context.params;

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    safeLog('Buscando transação pendente para usuário', { userId });

    // Buscar transação pendente no Supabase
    const { data: transaction, error } = await supabase
      .from('transacoes')
      .select('*')
      .eq('users', userId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrou transação pendente
        return NextResponse.json(null);
      }

      console.error('Erro ao buscar transação:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      return NextResponse.json(
        { error: 'Erro ao buscar transação' },
        { status: 500 }
      );
    }

    if (!transaction) {
      return NextResponse.json(null);
    }

    // Buscar informações atualizadas do produto
    if (transaction.produto) {
      const { data: produto, error: produtoError } = await supabase
        .from('produtosAicrusAcademy')
        .select('*')
        .eq('id', transaction.produto)
        .single();

      if (!produtoError && produto) {
        // Verificar se o valor na transação é diferente do valor atual do produto
        const valorProdutoAtual = produto.valor;
        
        // Se o valor na transação for diferente do valor atual do produto
        if (transaction.valor !== valorProdutoAtual) {
          console.log('Valor do produto foi atualizado:', {
            valorAntigo: transaction.valor,
            valorNovo: valorProdutoAtual,
            produtoId: produto.id
          });
          
          // Atualizar o valor na transação
          const { data: transacaoAtualizada, error: updateError } = await supabase
            .from('transacoes')
            .update({
              valor: valorProdutoAtual,
              dataHora: new Date().toISOString(),
              metaData: {
                ...transaction.metaData,
                produto: {
                  ...(transaction.metaData?.produto || {}),
                  valor: valorProdutoAtual
                },
                valorAtualizado: true,
                valorAnterior: transaction.valor
              }
            })
            .eq('id', transaction.id)
            .select()
            .single();
            
          if (!updateError && transacaoAtualizada) {
            console.log('Transação atualizada com novo valor do produto:', {
              id: transacaoAtualizada.id,
              valorAtualizado: transacaoAtualizada.valor
            });
            
            // Retornar a transação atualizada
            safeLog('Transação pendente encontrada e atualizada', {
              id: transacaoAtualizada.id,
              status: transacaoAtualizada.status,
              users: transacaoAtualizada.users,
              valorAtualizado: true
            });
            
            return NextResponse.json(transacaoAtualizada);
          }
        }
      }
    }

    safeLog('Transação pendente encontrada', {
      id: transaction.id,
      status: transaction.status,
      users: transaction.users
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 