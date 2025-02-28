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
      transactionId
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

    // Obter IP do cliente
    const remoteIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '127.0.0.1';

    // Criar pagamento
    const payment = await createCreditCardPayment({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: Number(value),
      dueDate,
      description,
      externalReference: transactionId,
      creditCard,
      creditCardHolderInfo,
      installmentCount: installmentCount || 1,
      installmentValue: installmentValue || value,
      remoteIp,
      callback: {
        successUrl: process.env.NEXT_PUBLIC_SUCCESS_URL || 'https://www.aicrustech.com/',
        autoRedirect: true
      }
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
    
    let errorMessage = 'Erro ao processar pagamento';
    let statusCode = 500;

    if (error instanceof Error) {
      // Verificar se é um erro do Asaas
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