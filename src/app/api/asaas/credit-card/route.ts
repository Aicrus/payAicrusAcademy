import { NextResponse } from 'next/server';
import { createCreditCardPayment } from '@/services/asaas/creditCard';
import { format } from 'date-fns';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      customerId, 
      description, 
      value,
      creditCard,
      creditCardHolderInfo,
      installmentCount,
      installmentValue,
      remoteIp
    } = body;

    // Validar dados obrigatórios
    if (!customerId || !description || !value || !creditCard || !creditCardHolderInfo) {
      return NextResponse.json(
        { error: 'Dados incompletos para pagamento com cartão' },
        { status: 400 }
      );
    }

    // Data de vencimento: hoje
    const dueDate = format(new Date(), 'yyyy-MM-dd');

    // Criar pagamento
    const payment = await createCreditCardPayment({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: Number(value),
      dueDate,
      description,
      creditCard,
      creditCardHolderInfo,
      installmentCount: installmentCount || 1,
      installmentValue: installmentValue || value,
      remoteIp: remoteIp || request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      value: payment.value,
      netValue: payment.netValue,
      description: payment.description,
      installmentCount: payment.installmentCount,
      installmentValue: payment.installmentValue,
      dueDate: payment.dueDate,
      confirmedDate: payment.confirmedDate
    });
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao processar pagamento' },
      { status: 500 }
    );
  }
} 