import { NextResponse } from 'next/server';
import { createBoletoPayment, getBoletoIdentification } from '@/services/asaas/payment';
import { addDays, format } from 'date-fns';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, description, value } = body;

    // Validar dados obrigatórios
    if (!customerId || !description || !value) {
      return NextResponse.json(
        { error: 'Dados incompletos para geração do boleto' },
        { status: 400 }
      );
    }

    // Data de vencimento: 3 dias a partir de hoje
    const dueDate = format(addDays(new Date(), 3), 'yyyy-MM-dd');

    // Criar boleto
    const boletoPayment = await createBoletoPayment({
      customer: customerId,
      billingType: 'BOLETO',
      value: Number(value),
      dueDate,
      description
    });

    // Obter linha digitável
    const boletoIdentification = await getBoletoIdentification(boletoPayment.id);

    return NextResponse.json({
      paymentId: boletoPayment.id,
      status: boletoPayment.status,
      bankSlipUrl: boletoPayment.bankSlipUrl,
      value: boletoPayment.value,
      dueDate: boletoPayment.dueDate,
      description: boletoPayment.description,
      identificationField: boletoIdentification.identificationField,
      barCode: boletoIdentification.barCode
    });
  } catch (error) {
    console.error('Erro ao gerar boleto:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao gerar boleto' },
      { status: 500 }
    );
  }
} 