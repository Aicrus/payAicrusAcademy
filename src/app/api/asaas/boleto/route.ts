import { NextResponse } from 'next/server';
import { createBoletoPayment, getBoletoIdentification } from '@/services/asaas/payment';
import { addDays, format } from 'date-fns';
import { ASAAS_CONFIG } from '@/config/asaas';

export async function POST(request: Request) {
  try {
    console.log('Rota API Boleto - Iniciando processamento');

    // Verificar configuração do Asaas
    try {
      console.log('URL da API:', ASAAS_CONFIG.API_URL);
      const headers = ASAAS_CONFIG.getHeaders();
      console.log('Headers configurados:', {
        ...headers,
        access_token: headers.access_token ? headers.access_token.substring(0, 10) + '...' : undefined
      });
    } catch (configError) {
      console.error('Erro na configuração do Asaas:', configError);
      return NextResponse.json(
        { error: 'Erro na configuração do servidor' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(error => {
      console.error('Erro ao processar JSON da requisição:', error);
      throw new Error('Dados da requisição inválidos');
    });
    
    const { customerId, description, value } = body;

    console.log('Recebendo requisição Boleto:', {
      customerId,
      value
    });

    // Validar dados obrigatórios
    if (!customerId || !description || value === undefined) {
      console.error('Dados incompletos:', { customerId, description, value });
      return NextResponse.json(
        { error: 'Dados incompletos para geração do boleto' },
        { status: 400 }
      );
    }

    // Garantir que o valor seja um número positivo
    const numericValue = Number(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      console.error('Valor inválido:', value);
      return NextResponse.json(
        { error: 'Valor deve ser um número positivo' },
        { status: 400 }
      );
    }

    // Validar valor mínimo exigido pelo Asaas (R$ 5,00)
    if (numericValue < 5) {
      console.error('Valor menor que o mínimo exigido pelo Asaas:', numericValue);
      return NextResponse.json(
        { error: 'O valor mínimo para cobranças via Boleto Bancário é R$ 5,00.' },
        { status: 400 }
      );
    }

    // Data de vencimento: 3 dias a partir de hoje
    const dueDate = format(addDays(new Date(), 3), 'yyyy-MM-dd');
    console.log('Data de vencimento:', dueDate);

    // Criar boleto
    console.log('Criando boleto...');
    let boletoPayment;
    try {
      boletoPayment = await createBoletoPayment({
        customer: customerId,
        billingType: 'BOLETO',
        value: numericValue,
        dueDate,
        description
      });
    } catch (boletoError) {
      console.error('Erro ao criar boleto:', boletoError);
      return NextResponse.json(
        { 
          error: 'Erro ao criar boleto',
          message: boletoError instanceof Error ? boletoError.message : 'Erro desconhecido'
        },
        { status: 500 }
      );
    }

    console.log('Boleto criado:', {
      id: boletoPayment.id,
      status: boletoPayment.status
    });

    // Obter linha digitável
    console.log('Obtendo linha digitável...');
    let boletoIdentification;
    try {
      boletoIdentification = await getBoletoIdentification(boletoPayment.id);
    } catch (identificationError) {
      console.error('Erro ao obter linha digitável:', identificationError);
      // Continuar mesmo sem a linha digitável
      boletoIdentification = {
        identificationField: "Linha digitável indisponível no momento",
        nossoNumero: "",
        barCode: ""
      };
    }

    console.log('Boleto gerado com sucesso');

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
    console.error('Erro detalhado na rota de criação de boleto:', error);
    
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