import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { usersAicrusAcademy, idCustomerAsaas, creditCardToken, creditCardNumber, creditCardBrand } = body;

    // Atualiza o token do cartão na tabela cards
    const { data, error } = await supabase
      .from('cards')
      .update({
        creditCardToken,
        creditCardNumber,
        creditCardBrand
      })
      .eq('usersAicrusAcademy', usersAicrusAcademy)
      .eq('idCustomerAsaas', idCustomerAsaas)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar cartão:', error);
      return NextResponse.json({ error: 'Erro ao atualizar cartão' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 