import { NextResponse } from 'next/server';
import { createTokenizedPayment } from '@/services/asaas/creditCard';
import { format } from 'date-fns';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      customerId, 
      description, 
      value,
      creditCardToken,
      installmentCount,
      installmentValue,
      discount,
      dueDate,
      transactionId
    } = body;

    // Validar dados obrigatórios
    if (!customerId || !description || !value || !creditCardToken) {
      return NextResponse.json(
        { error: 'Dados incompletos para pagamento com token' },
        { status: 400 }
      );
    }

    // Usar a data de vencimento fornecida ou hoje
    const paymentDueDate = dueDate || format(new Date(), 'yyyy-MM-dd');

    // Obter IP do cliente
    const remoteIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '127.0.0.1';

    // Criar pagamento com token
    const payment = await createTokenizedPayment({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: Number(value),
      dueDate: paymentDueDate,
      description,
      externalReference: transactionId,
      creditCardToken,
      installmentCount: installmentCount || 1,
      installmentValue: installmentValue || value,
      discount,
      remoteIp
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
    console.error('Erro ao processar pagamento com token:', error);
    
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