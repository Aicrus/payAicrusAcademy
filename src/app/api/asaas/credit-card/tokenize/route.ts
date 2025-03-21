import { NextResponse } from 'next/server';
import { tokenizeCreditCard } from '@/services/asaas/creditCard';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      customer, 
      creditCard,
      creditCardHolderInfo,
      usersAicrusAcademy
    } = body;

    // Validar dados obrigatórios
    if (!customer || !creditCard || !creditCardHolderInfo || !usersAicrusAcademy) {
      return NextResponse.json(
        { error: 'Dados incompletos para tokenização do cartão' },
        { status: 400 }
      );
    }

    // Verificar se já existe um cartão salvo para este usuário
    const { data: existingCard, error: queryError } = await supabase
      .from('cards')
      .select('id, creditCardNumber, creditCardToken')
      .eq('usersAicrusAcademy', usersAicrusAcademy)
      .eq('idCustomerAsaas', customer)
      .single();

    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 é o código para "nenhum registro encontrado"
      console.error('Erro ao verificar cartão existente:', queryError);
      return NextResponse.json(
        { error: 'Erro ao verificar cartão existente' },
        { status: 500 }
      );
    }

    // Se o cartão já existe, retornar os dados dele
    if (existingCard) {
      console.log('Cartão já existe para este usuário:', existingCard.id);
      
      return NextResponse.json({
        creditCardToken: existingCard.creditCardToken,
        creditCardNumber: existingCard.creditCardNumber,
        creditCardBrand: 'MASTERCARD', // Assumindo que seja o mesmo
        message: 'Cartão já registrado para este usuário'
      });
    }

    // Obter IP do cliente
    const remoteIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '127.0.0.1';

    // Tokenizar o cartão
    const tokenResult = await tokenizeCreditCard({
      customer,
      creditCard,
      creditCardHolderInfo,
      remoteIp
    });

    // Salvar o cartão tokenizado no banco de dados
    const { data: savedCard, error: insertError } = await supabase
      .from('cards')
      .insert({
        creditCardNumber: tokenResult.creditCardNumber,
        creditCardBrand: tokenResult.creditCardBrand,
        creditCardToken: tokenResult.creditCardToken,
        usersAicrusAcademy: usersAicrusAcademy,
        idCustomerAsaas: customer
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao salvar cartão no banco de dados:', insertError);
      // Mesmo com erro ao salvar, retornamos o token para não impedir o pagamento
      return NextResponse.json({
        creditCardToken: tokenResult.creditCardToken,
        creditCardNumber: tokenResult.creditCardNumber,
        creditCardBrand: tokenResult.creditCardBrand,
        warning: 'Cartão tokenizado com sucesso, mas não foi possível salvá-lo para uso futuro'
      });
    }

    console.log('Cartão salvo com sucesso:', savedCard.id);

    return NextResponse.json({
      creditCardToken: tokenResult.creditCardToken,
      creditCardNumber: tokenResult.creditCardNumber,
      creditCardBrand: tokenResult.creditCardBrand,
      message: 'Cartão tokenizado e salvo com sucesso'
    });
  } catch (error) {
    console.error('Erro ao tokenizar cartão:', error);
    
    let errorMessage = 'Erro ao tokenizar cartão';
    let statusCode = 500;

    if (error instanceof Error) {
      // Verificar tipo de erro
      if (error.message.includes('400') || error.message.includes('cartão')) {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message.includes('401') || error.message.includes('token')) {
        statusCode = 401;
        errorMessage = 'Erro de autenticação com a operadora de pagamento';
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 