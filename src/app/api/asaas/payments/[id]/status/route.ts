import { NextResponse } from 'next/server';
import { checkPaymentStatus } from '@/services/asaas/payment';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Verificando status do pagamento:', id);

    const status = await checkPaymentStatus(id);

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