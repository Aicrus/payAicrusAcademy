import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json();
    const { id: paramId } = await params;
    const id = Number(paramId);

    console.log('Dados recebidos para atualização:', { id, data });

    if (!id) {
      return NextResponse.json(
        { error: 'ID da transação inválido' },
        { status: 400 }
      );
    }

    // Mapear os campos da nova estrutura para a antiga
    const mappedData = {
      ...data,
      valor: data.valor || data.amount,
      metodoPagamento: data.metodoPagamento || data.paymentMethod,
      idPayAsaas: data.idPayAsaas || data.paymentId,
      dataHora: new Date().toISOString(),
    };

    console.log('Dados mapeados para atualização:', mappedData);

    // Atualizar transação no Supabase
    const { data: transaction, error } = await supabase
      .from('transacoes')
      .update(mappedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro detalhado do Supabase:', error);
      return NextResponse.json(
        { error: `Erro ao atualizar transação: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Transação atualizada com sucesso:', transaction);
    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Erro detalhado ao processar requisição:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Alias PUT para PATCH
export const PUT = PATCH; 