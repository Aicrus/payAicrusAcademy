import { NextResponse } from 'next/server';
import { createAsaasPayment, getAsaasPixQrCode } from '@/services/asaas/payment';
import { ASAAS_CONFIG } from '@/config/asaas';

interface PixRequestData {
  customerId: string;
  description: string;
  value: number;
}

export async function POST(request: Request) {
  try {
    console.log('Rota API PIX - Iniciando processamento');

    // Verificar configuração do Asaas
    try {
      console.log('URL da API:', ASAAS_CONFIG.API_URL);
      const headers = ASAAS_CONFIG.getHeaders();
      console.log('Headers configurados:', {
        ...headers,
        access_token: headers.access_token ? '***' : undefined
      });
    } catch (configError) {
      console.error('Erro na configuração do Asaas:', configError);
      return NextResponse.json(
        { error: 'Erro na configuração do servidor' },
        { status: 500 }
      );
    }
    
    const data: PixRequestData = await request.json().catch(error => {
      console.error('Erro ao processar JSON da requisição:', error);
      throw new Error('Dados da requisição inválidos');
    });

    console.log('Recebendo requisição PIX:', {
      customerId: data.customerId,
      value: data.value
    });

    // Validação básica dos dados
    if (!data.customerId || !data.description || data.value === undefined) {
      console.error('Dados incompletos:', data);
      return NextResponse.json(
        { 
          error: 'Dados incompletos',
          details: {
            customerId: !data.customerId ? 'ID do cliente é obrigatório' : null,
            description: !data.description ? 'Descrição é obrigatória' : null,
            value: data.value === undefined ? 'Valor é obrigatório' : null,
          }
        },
        { status: 400 }
      );
    }

    // Garante que o valor seja um número positivo
    if (data.value <= 0) {
      console.error('Valor inválido:', data.value);
      return NextResponse.json(
        { error: 'Valor deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Validar valor mínimo
    if (data.value < 5) {
      console.error('Valor menor que o mínimo:', data.value);
      return NextResponse.json(
        { error: 'O valor mínimo para pagamento via PIX é de R$ 5,00' },
        { status: 400 }
      );
    }

    // Garante que o valor tenha no máximo 2 casas decimais
    const value = Number(data.value.toFixed(2));
    
    // Gerar data de vencimento (24h a partir de agora)
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Criar pagamento
    console.log('Criando pagamento...');
    const payment = await createAsaasPayment({
      customer: data.customerId,
      billingType: 'PIX',
      value: value,
      dueDate: dueDateStr,
      description: data.description
    });

    console.log('Pagamento criado:', payment);

    // Gerar QR Code
    console.log('Gerando QR Code...');
    const qrCode = await getAsaasPixQrCode(payment.id);

    console.log('PIX gerado com sucesso');

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      encodedImage: qrCode.encodedImage,
      payload: qrCode.payload,
      expirationDate: qrCode.expirationDate
    });
  } catch (error) {
    console.error('Erro detalhado na rota de criação de PIX:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Erro ao processar pagamento',
          message: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
} 