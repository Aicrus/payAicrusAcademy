import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { usersAicrusAcademy, idCustomerAsaas, creditCardToken, creditCardNumber, creditCardBrand } = body;

    console.log('Dados recebidos para atualização:', {
      usersAicrusAcademy,
      idCustomerAsaas,
      creditCardToken: creditCardToken ? '****' : null,
      creditCardNumber: creditCardNumber ? '****' + creditCardNumber.slice(-4) : null,
      creditCardBrand
    });

    // Primeiro, verificar se o cartão existe
    const { data: existingCard, error: queryError } = await supabase
      .from('cards')
      .select('*')
      .eq('usersAicrusAcademy', usersAicrusAcademy)
      .eq('idCustomerAsaas', idCustomerAsaas)
      .single();

    if (queryError) {
      console.error('Erro ao buscar cartão existente:', queryError);
      return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 });
    }

    console.log('Cartão encontrado:', {
      id: existingCard.id,
      oldToken: '****',
      newToken: creditCardToken ? '****' : null
    });

    // Atualiza o token do cartão na tabela cards
    const { data, error } = await supabase
      .from('cards')
      .update({
        creditCardToken,
        creditCardNumber,
        creditCardBrand,
        updatedAt: new Date().toISOString()
      })
      .eq('usersAicrusAcademy', usersAicrusAcademy)
      .eq('idCustomerAsaas', idCustomerAsaas)
      .select()
      .single();

    if (error) {
      console.error('Erro detalhado ao atualizar cartão:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({ error: 'Erro ao atualizar cartão' }, { status: 500 });
    }

    console.log('Cartão atualizado com sucesso:', {
      id: data.id,
      newToken: '****',
      updatedAt: data.updatedAt
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 