import { NextResponse } from 'next/server';
import { ASAAS_CONFIG } from '@/config/asaas';

export async function GET(
  request: Request,
  context: any
) {
  try {
    const { id } = context.params;
    console.log('Verificando status do pagamento no Asaas:', id);

    const url = `${ASAAS_CONFIG.API_URL}/payments/${id}`;
    console.log('URL da API Asaas:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? '***' : undefined
    });

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    // Capturar o corpo da resposta como texto primeiro
    const responseText = await response.text();
    console.log('Resposta bruta do Asaas:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Erro ao parsear resposta JSON do Asaas:', parseError);
      throw new Error('Resposta inválida do servidor Asaas');
    }

    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data.errors?.[0]?.description || 'Erro ao verificar status do pagamento');
    }

    console.log('Status retornado pelo Asaas:', {
      id: data.id,
      status: data.status,
      value: data.value,
      netValue: data.netValue,
      confirmedDate: data.confirmedDate,
      paymentDate: data.paymentDate
    });

    return NextResponse.json({
      id: data.id,
      status: data.status,
      value: data.value,
      netValue: data.netValue,
      description: data.description,
      billingType: data.billingType,
      confirmedDate: data.confirmedDate,
      paymentDate: data.paymentDate,
      dateCreated: data.dateCreated,
      lastInvoiceViewedDate: data.lastInvoiceViewedDate,
      lastBankSlipViewedDate: data.lastBankSlipViewedDate,
      invoiceUrl: data.invoiceUrl,
      bankSlipUrl: data.bankSlipUrl,
      transactionReceiptUrl: data.transactionReceiptUrl
    });
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