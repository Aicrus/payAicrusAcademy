import { NextResponse } from 'next/server';
import { checkPaymentStatus } from '@/services/asaas/payment';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Verificando status do pagamento:', params.id);

    const status = await checkPaymentStatus(params.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Erro ao verificar status',
          message: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao verificar status' },
      { status: 500 }
    );
  }
} 