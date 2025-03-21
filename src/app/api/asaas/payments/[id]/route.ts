import { NextResponse } from 'next/server';
import { ASAAS_CONFIG } from '@/config/asaas';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const paymentId = context.params.id;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'ID do pagamento é obrigatório' },
        { status: 400 }
      );
    }

    console.log('Verificando status do pagamento:', paymentId);

    const url = `${ASAAS_CONFIG.API_URL}/payments/${paymentId}`;
    const headers = ASAAS_CONFIG.getHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao verificar status:', {
        status: response.status,
        body: errorText
      });
      throw new Error(`Erro ao verificar status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Status do pagamento:', {
      id: data.id,
      status: data.status
    });

    return NextResponse.json({
      id: data.id,
      status: data.status,
      value: data.value,
      netValue: data.netValue,
      description: data.description,
      billingType: data.billingType,
      confirmedDate: data.confirmedDate,
      paymentDate: data.paymentDate
    });
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao verificar status',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 