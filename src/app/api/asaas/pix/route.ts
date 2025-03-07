import { NextResponse } from 'next/server';
import { createPixPayment } from '@/services/asaas/payment';
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

    // Garante que o valor tenha no máximo 2 casas decimais
    const value = Number(data.value.toFixed(2));
    
    // Criar QR Code PIX estático diretamente
    console.log('Gerando QR Code PIX estático...');
    
    // Data de expiração para o próximo ano
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    const expirationDateStr = expirationDate.toISOString().split('T')[0] + ' 23:59:59';
    
    // Chave PIX fixa do sistema
    const addressKey = "7a131f8e-d75a-45b5-b999-09944c333a5d";
    
    const pixData = await createPixPayment({
      addressKey: addressKey,
      description: `Assinatura Aicrus Academy - ${data.description}`,
      value: value,
      format: 'ALL',
      expirationDate: expirationDateStr,
      allowsMultiplePayments: true
    });

    console.log('PIX estático gerado com sucesso');

    return NextResponse.json({
      paymentId: pixData.id,
      status: 'PENDING',
      encodedImage: pixData.encodedImage,
      payload: pixData.payload,
      expirationDate: pixData.expirationDate
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