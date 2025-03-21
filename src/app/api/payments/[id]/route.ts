import { NextResponse } from 'next/server';
import { checkPaymentStatus } from '@/services/asaas/payment';
import { ASAAS_CONFIG } from '@/config/asaas';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'ID do pagamento é obrigatório' },
        { status: 400 }
      );
    }

    console.log('Verificando status do pagamento:', paymentId);
    console.log('URL da API:', `${ASAAS_CONFIG.API_URL}/payments/${paymentId}`);

    try {
      // Verificar status do pagamento
      const paymentStatus = await checkPaymentStatus(paymentId);
      console.log('Status retornado com sucesso:', paymentStatus);
      
      return NextResponse.json(paymentStatus);
    } catch (asaasError) {
      console.error('Erro ao verificar status na API Asaas:', asaasError);
      
      // Retornar um status padrão para evitar quebra na interface
      return NextResponse.json({
        id: paymentId,
        status: 'PENDING',
        value: 0,
        netValue: 0,
        description: 'Pagamento em processamento',
        billingType: 'PIX',
        confirmedDate: null,
        paymentDate: null
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao verificar status do pagamento',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 