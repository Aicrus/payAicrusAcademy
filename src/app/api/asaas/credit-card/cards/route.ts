import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Pegar parâmetros da URL
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const customerId = url.searchParams.get('customerId');

    if (!userId && !customerId) {
      return NextResponse.json(
        { error: 'É necessário fornecer userId ou customerId' },
        { status: 400 }
      );
    }

    // Construir a query
    let query = supabase
      .from('cards')
      .select('*')
      .eq('listarCard', true);

    // Filtrar por ID do usuário ou ID do cliente
    if (userId) {
      query = query.eq('usersAicrusAcademy', userId);
    }
    
    if (customerId) {
      query = query.eq('idCustomerAsaas', customerId);
    }

    // Executar a consulta
    const { data: cards, error } = await query;

    if (error) {
      console.error('Erro ao buscar cartões:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar cartões salvos' },
        { status: 500 }
      );
    }

    // Mascarar os números dos cartões para segurança
    const maskedCards = cards.map(card => ({
      ...card,
      creditCardNumber: `**** **** **** ${card.creditCardNumber}` // Assumindo que creditCardNumber já é os 4 últimos dígitos
    }));

    return NextResponse.json(maskedCards);
  } catch (error) {
    console.error('Erro ao processar solicitação de cartões:', error);
    
    return NextResponse.json(
      { error: 'Erro ao processar solicitação de cartões' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { cardId, userId } = body;

    if (!cardId || !userId) {
      return NextResponse.json(
        { error: 'É necessário fornecer cardId e userId' },
        { status: 400 }
      );
    }

    // Verificar se o cartão pertence ao usuário antes de permitir a exclusão
    const { data: card, error: queryError } = await supabase
      .from('cards')
      .select('id')
      .eq('id', cardId)
      .eq('usersAicrusAcademy', userId)
      .single();

    if (queryError) {
      console.error('Erro ao verificar propriedade do cartão:', queryError);
      
      if (queryError.code === 'PGRST116') { // No results found
        return NextResponse.json(
          { error: 'Cartão não encontrado ou não pertence ao usuário' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao verificar propriedade do cartão' },
        { status: 500 }
      );
    }

    // Marcar o cartão como não listável (soft delete)
    // Alternativa: podemos fazer um delete real se preferir
    const { error: updateError } = await supabase
      .from('cards')
      .update({ listarCard: false })
      .eq('id', cardId);

    if (updateError) {
      console.error('Erro ao remover cartão:', updateError);
      return NextResponse.json(
        { error: 'Erro ao remover cartão' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cartão removido com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao processar remoção de cartão:', error);
    
    return NextResponse.json(
      { error: 'Erro ao processar remoção de cartão' },
      { status: 500 }
    );
  }
} 