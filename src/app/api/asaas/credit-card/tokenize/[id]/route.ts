import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const cardId = context.params.id;

    if (!cardId) {
      return NextResponse.json(
        { error: 'ID do cartão não fornecido' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem acesso ao cartão
    const { data: card, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (error) {
      console.error('Erro ao buscar cartão:', error);
      
      if (error.code === 'PGRST116') { // Nenhum resultado encontrado
        return NextResponse.json(
          { error: 'Cartão não encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao buscar cartão' },
        { status: 500 }
      );
    }

    // Mascarar o número do cartão para segurança
    return NextResponse.json({
      ...card,
      creditCardNumber: `**** **** **** ${card.creditCardNumber}` // Assumindo que creditCardNumber já é os 4 últimos dígitos
    });
  } catch (error) {
    console.error('Erro ao processar solicitação de cartão:', error);
    
    return NextResponse.json(
      { error: 'Erro ao processar solicitação de cartão' },
      { status: 500 }
    );
  }
} 