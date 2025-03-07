import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { safeLog } from '@/utils/logger';

type RouteParams = {
  params: {
    userId: string;
  };
};

export async function GET(
  request: Request,
  context: RouteParams
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