import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const id = Number(params.id);

    if (!id) {
      return NextResponse.json(
        { error: 'ID da transação inválido' },
        { status: 400 }
      );
    }

    // Atualizar transação no Supabase
    const { data: transaction, error } = await supabase
      .from('transacoes')
      .update({
        ...data,
        dataHora: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar transação:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar transação' },
        { status: 500 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 