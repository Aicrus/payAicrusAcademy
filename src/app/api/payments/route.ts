import { NextResponse } from 'next/server';
import { createAsaasPayment } from '@/services/asaas/payment';
import { TransactionService } from '@/services/transaction';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { billingType, customer, value, dueDate, description } = body;

    if (!billingType || !customer || !value || !dueDate || !description) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    if (billingType !== 'PIX') {
      return NextResponse.json(
        { error: 'Apenas cobrança PIX é suportada' },
        { status: 400 }
      );
    }

    // Criar pagamento no Asaas
    const payment = await createAsaasPayment({
      customer,
      billingType: 'PIX',
      value: Number(value),
      dueDate,
      description
    });

    // Retornar os dados do pagamento
    return NextResponse.json(payment);
  } catch (error) {
    console.error('Erro ao criar cobrança:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar pagamento',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 