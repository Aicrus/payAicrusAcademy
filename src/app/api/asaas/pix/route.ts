import { NextResponse } from 'next/server';
import { ASAAS_CONFIG } from '@/config/asaas';

interface PixRequestData {
  customerId: string;
  description: string;
  value: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, description, value } = body;

    if (!customerId || !description || !value) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // 1. Criar a cobrança PIX
    const paymentUrl = `${ASAAS_CONFIG.API_URL}/payments`;
    const headers = ASAAS_CONFIG.getHeaders();

    // Data de vencimento para amanhã
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const paymentBody = {
      customer: customerId,
      billingType: 'PIX',
      value: Number(value.toFixed(2)),
      dueDate: dueDateStr,
      description
    };

    console.log('Criando cobrança PIX:', paymentBody);

    const paymentResponse = await fetch(paymentUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentBody),
      cache: 'no-store'
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Erro ao criar cobrança:', {
        status: paymentResponse.status,
        body: errorText
      });
      throw new Error(`Erro ao criar cobrança: ${paymentResponse.status}`);
    }

    const payment = await paymentResponse.json();
    console.log('Cobrança criada:', payment);

    // 2. Gerar QR Code PIX
    const qrCodeUrl = `${ASAAS_CONFIG.API_URL}/payments/${payment.id}/pixQrCode`;
    console.log('Gerando QR Code para cobrança:', payment.id);

    const qrCodeResponse = await fetch(qrCodeUrl, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!qrCodeResponse.ok) {
      const errorText = await qrCodeResponse.text();
      console.error('Erro ao gerar QR Code:', {
        status: qrCodeResponse.status,
        body: errorText
      });
      throw new Error(`Erro ao gerar QR Code: ${qrCodeResponse.status}`);
    }

    const qrCodeData = await qrCodeResponse.json();

    // 3. Retornar dados combinados
    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      value: payment.value,
      netValue: payment.netValue,
      description: payment.description,
      encodedImage: qrCodeData.encodedImage,
      payload: qrCodeData.payload,
      expirationDate: payment.dueDate
    });
  } catch (error) {
    console.error('Erro ao processar PIX:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar pagamento',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 