import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    console.log('Dados recebidos para criação de transação:', {
      valor: data.valor,
      status: data.status,
      metodoPagamento: data.metodoPagamento,
      users: data.users,
      produto: data.produto
    });

    // Validar dados obrigatórios
    if (!data.valor || !data.status || !data.metodoPagamento || !data.users || !data.produto) {
      console.error('Dados obrigatórios faltando:', {
        temValor: !!data.valor,
        temStatus: !!data.status,
        temMetodoPagamento: !!data.metodoPagamento,
        temUsers: !!data.users,
        temProduto: !!data.produto
      });
      
      return NextResponse.json(
        { error: 'Dados incompletos para criação da transação' },
        { status: 400 }
      );
    }

    // Criar transação no Supabase
    const { data: transaction, error } = await supabase
      .from('transacoes')
      .insert({
        valor: data.valor,
        status: data.status,
        metodoPagamento: data.metodoPagamento,
        idCustomerAsaas: data.idCustomerAsaas,
        idPayAsaas: data.idPayAsaas,
        users: data.users,
        produto: data.produto,
        metaData: data.metaData || {},
        dataHora: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar transação:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      return NextResponse.json(
        { error: 'Erro ao criar transação' },
        { status: 500 }
      );
    }

    console.log('Transação criada com sucesso:', {
      id: transaction.id,
      produto: transaction.produto,
      users: transaction.users,
      status: transaction.status
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