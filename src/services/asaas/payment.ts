import { ASAAS_CONFIG } from '@/config/asaas';

export interface CreatePixPaymentData {
  addressKey: string;
  description: string;
  value: number;
  format?: 'ALL' | 'QRCODE' | 'EMV';
  expirationDate?: string;
  allowsMultiplePayments?: boolean;
}

export interface PixPayment {
  id: string;
  encodedImage: string;
  payload: string;
  allowsMultiplePayments: boolean;
  expirationDate: string;
  externalReference: string | null;
}

export interface AsaasPaymentData {
  customer: string;
  billingType: 'PIX';
  value: number;
  dueDate: string;
  description: string;
}

export interface AsaasPayment {
  id: string;
  status: string;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export interface PaymentStatus {
  id: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH';
  value: number;
  netValue: number;
  description: string;
  billingType: string;
  confirmedDate: string | null;
  paymentDate: string | null;
}

export interface AsaasBoletoPaymentData {
  customer: string;
  billingType: 'BOLETO';
  value: number;
  dueDate: string;
  description: string;
}

export interface BoletoPayment {
  id: string;
  status: string;
  bankSlipUrl: string;
  value: number;
  dueDate: string;
  description: string;
}

export interface BoletoIdentification {
  identificationField: string;
  nossoNumero: string;
  barCode: string;
}

// Validações de segurança
const validatePixData = (data: CreatePixPaymentData) => {
  // Validar chave PIX
  if (!data.addressKey || data.addressKey.length < 10) {
    throw new Error('Chave PIX inválida');
  }

  // Validar descrição
  if (!data.description || data.description.length < 5) {
    throw new Error('Descrição inválida');
  }

  // Validar data de expiração
  if (data.expirationDate) {
    const expDate = new Date(data.expirationDate);
    const now = new Date();
    if (expDate <= now) {
      throw new Error('Data de expiração inválida');
    }
  }

  // Validar formato
  if (data.format && !['ALL', 'QRCODE', 'EMV'].includes(data.format)) {
    throw new Error('Formato inválido');
  }
}

export async function createPixPayment(data: CreatePixPaymentData): Promise<PixPayment> {
  try {
    // Validar dados antes de prosseguir
    validatePixData(data);

    // Verificar variáveis de ambiente
    if (!process.env.ASAAS_ACCESS_TOKEN) {
      throw new Error('Token de acesso não configurado');
    }

    if (!process.env.NEXT_PUBLIC_ASAAS_API_URL) {
      throw new Error('URL da API não configurada');
    }

    // Não logar dados sensíveis
    console.log('Iniciando criação de pagamento PIX');

    const url = `${process.env.NEXT_PUBLIC_ASAAS_API_URL}/pix/qrCodes/static`;
    
    // Limita a descrição a 37 caracteres
    const description = data.description.length > 37 
      ? data.description.substring(0, 37)
      : data.description;

    // Formatar o token de acesso
    const accessToken = process.env.ASAAS_ACCESS_TOKEN.startsWith('aact_') 
      ? `$${process.env.ASAAS_ACCESS_TOKEN}`
      : process.env.ASAAS_ACCESS_TOKEN;

    // Headers corretos para a API do Asaas
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'access_token': accessToken
    };

    // Log para debug (sem expor o token completo)
    console.log('Headers configurados:', {
      contentType: headers['Content-Type'],
      accept: headers['Accept'],
      hasAccessToken: !!headers['access_token'],
      tokenPrefix: headers['access_token']?.substring(0, 5)
    });

    // Evitar logging de dados sensíveis
    console.log('Iniciando requisição para Asaas');

    const body = {
      addressKey: data.addressKey,
      description: description,
      // Garantir que o valor seja sempre um número com 2 casas decimais
      value: Number(Number(data.value).toFixed(2)),
      format: data.format || 'ALL',
      expirationDate: data.expirationDate || getDefaultExpirationDate(),
      allowsMultiplePayments: data.allowsMultiplePayments || false
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        cache: 'no-store'
      });

      console.log('Status da resposta:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', {
          status: response.status,
          body: errorText
        });
        throw new Error(`Erro na API Asaas: ${response.status} - ${errorText || response.statusText}`);
      }

      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === '') {
        console.error('Resposta vazia recebida do servidor');
        throw new Error('Resposta vazia do servidor Asaas');
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Erro ao processar resposta da API:', e);
        throw new Error('Erro ao processar resposta do servidor');
      }

      if (!responseData.encodedImage || !responseData.payload) {
        console.error('Resposta inválida:', responseData);
        throw new Error('Resposta inválida do servidor Asaas');
      }

      // Log apenas do ID para rastreamento
      console.log('QR Code PIX gerado com sucesso:', {
        id: responseData.id,
        hasEncodedImage: !!responseData.encodedImage,
        hasPayload: !!responseData.payload
      });

      return responseData;
    } catch (fetchError) {
      console.error('Erro na requisição Asaas:', fetchError);
      throw new Error(
        fetchError instanceof Error 
          ? fetchError.message 
          : 'Erro na comunicação com o servidor Asaas'
      );
    }
  } catch (error) {
    // Não expor detalhes do erro na produção
    console.error('Erro ao processar pagamento:', error);
    throw error;
  }
}

function getDefaultExpirationDate(): string {
  const date = new Date();
  date.setHours(date.getHours() + 24);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

export async function createAsaasPayment(data: AsaasPaymentData): Promise<AsaasPayment> {
  try {
    console.log('Iniciando criação de pagamento...', {
      customer: data.customer,
      value: data.value
    });

    const url = `${ASAAS_CONFIG.API_URL}/payments`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? '***' : undefined
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      throw new Error(responseData.errors?.[0]?.description || 'Erro ao criar pagamento');
    }

    console.log('Pagamento criado com sucesso:', {
      id: responseData.id,
      status: responseData.status
    });

    return {
      id: responseData.id,
      status: responseData.status
    };
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    throw error;
  }
}

export async function getAsaasPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  try {
    console.log('Iniciando geração de QR Code...', { paymentId });

    const url = `${ASAAS_CONFIG.API_URL}/payments/${paymentId}/pixQrCode`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? '***' : undefined
    });

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data.errors?.[0]?.description || 'Erro ao gerar QR Code');
    }

    console.log('QR Code gerado com sucesso:', {
      hasEncodedImage: !!data.encodedImage,
      hasPayload: !!data.payload
    });

    return {
      encodedImage: data.encodedImage,
      payload: data.payload,
      expirationDate: data.expirationDate
    };
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    throw error;
  }
}

export async function checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
  try {
    console.log('Verificando status do pagamento...', { paymentId });

    const url = `${ASAAS_CONFIG.API_URL}/payments/${paymentId}`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? '***' : undefined
    });

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data.errors?.[0]?.description || 'Erro ao verificar status do pagamento');
    }

    console.log('Status verificado com sucesso:', {
      id: data.id,
      status: data.status
    });

    return {
      id: data.id,
      status: data.status,
      value: data.value,
      netValue: data.netValue,
      description: data.description,
      billingType: data.billingType,
      confirmedDate: data.confirmedDate,
      paymentDate: data.paymentDate
    };
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    throw error;
  }
}

export async function createBoletoPayment(data: AsaasBoletoPaymentData): Promise<BoletoPayment> {
  try {
    console.log('Iniciando criação de boleto...', {
      customer: data.customer,
      value: data.value
    });

    const url = `${ASAAS_CONFIG.API_URL}/payments`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? '***' : undefined
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      throw new Error(responseData.errors?.[0]?.description || 'Erro ao criar boleto');
    }

    console.log('Boleto criado com sucesso:', {
      id: responseData.id,
      status: responseData.status
    });

    return {
      id: responseData.id,
      status: responseData.status,
      bankSlipUrl: responseData.bankSlipUrl,
      value: responseData.value,
      dueDate: responseData.dueDate,
      description: responseData.description
    };
  } catch (error) {
    console.error('Erro ao criar boleto:', error);
    throw error;
  }
}

export async function getBoletoIdentification(paymentId: string): Promise<BoletoIdentification> {
  try {
    console.log('Obtendo linha digitável do boleto...', { paymentId });

    const url = `${ASAAS_CONFIG.API_URL}/payments/${paymentId}/identificationField`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? '***' : undefined
    });

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data.errors?.[0]?.description || 'Erro ao obter linha digitável');
    }

    console.log('Linha digitável obtida com sucesso');

    return {
      identificationField: data.identificationField,
      nossoNumero: data.nossoNumero,
      barCode: data.barCode
    };
  } catch (error) {
    console.error('Erro ao obter linha digitável:', error);
    throw error;
  }
} 