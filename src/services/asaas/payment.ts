import { ASAAS_CONFIG } from '@/config/asaas';

export interface CreatePixPaymentData {
  customer: string;
  description: string;
  value: number;
  dueDate?: string;
}

export interface PixPayment {
  id: string;
  status: string;
  value: number;
  netValue: number;
  description: string;
  encodedImage: string;
  payload: string;
  expirationDate: string;
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
  value?: number;
  netValue?: number;
  description?: string;
  billingType?: string;
  pixTransaction?: any;
  dueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
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
  if (!data.customer || data.customer.length < 10) {
    throw new Error('Chave PIX inválida');
  }

  // Validar descrição
  if (!data.description || data.description.length < 5) {
    throw new Error('Descrição inválida');
  }

  // Validar valor
  if (data.value <= 0) {
    throw new Error('Valor deve ser maior que zero');
  }

  // Validar data de expiração
  if (data.dueDate) {
    const expDate = new Date(data.dueDate);
    const now = new Date();
    if (expDate <= now) {
      throw new Error('Data de expiração inválida');
    }
  }
}

export async function createPixPayment(data: CreatePixPaymentData): Promise<PixPayment> {
  try {
    // Verificar variáveis de ambiente
    if (!process.env.ASAAS_ACCESS_TOKEN) {
      throw new Error('Token de acesso não configurado');
    }

    if (!process.env.NEXT_PUBLIC_ASAAS_API_URL) {
      throw new Error('URL da API não configurada');
    }

    console.log('Iniciando criação de cobrança PIX');

    // 1. Primeiro criar a cobrança PIX
    const paymentUrl = `${process.env.NEXT_PUBLIC_ASAAS_API_URL}/payments`;
    
    // Formatar o token de acesso
    const accessToken = process.env.ASAAS_ACCESS_TOKEN.startsWith('aact_') 
      ? `$${process.env.ASAAS_ACCESS_TOKEN}`
      : process.env.ASAAS_ACCESS_TOKEN;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'access_token': accessToken
    };

    // Criar a cobrança
    const paymentBody = {
      customer: data.customer,
      billingType: 'PIX',
      value: Number(Number(data.value).toFixed(2)),
      dueDate: data.dueDate || getDefaultExpirationDate(),
      description: data.description
    };

    console.log('Criando cobrança PIX:', {
      customer: paymentBody.customer,
      value: paymentBody.value,
      dueDate: paymentBody.dueDate
    });

    // Criar a cobrança
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
      throw new Error(`Erro ao criar cobrança: ${paymentResponse.status} - ${errorText || paymentResponse.statusText}`);
    }

    const payment = await paymentResponse.json();
    
    if (!payment.id) {
      throw new Error('ID da cobrança não retornado');
    }

    // 2. Gerar o QR Code PIX
    const qrCodeUrl = `${process.env.NEXT_PUBLIC_ASAAS_API_URL}/payments/${payment.id}/pixQrCode`;
    
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
      throw new Error(`Erro ao gerar QR Code: ${qrCodeResponse.status} - ${errorText || qrCodeResponse.statusText}`);
    }

    const qrCodeData = await qrCodeResponse.json();

    // Combinar os dados da cobrança com o QR Code
    return {
      id: payment.id,
      status: payment.status,
      value: payment.value,
      netValue: payment.netValue,
      description: payment.description,
      encodedImage: qrCodeData.encodedImage,
      payload: qrCodeData.payload,
      expirationDate: payment.dueDate
    };

  } catch (error) {
    console.error('Erro ao processar pagamento PIX:', error);
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
      billingType: data.billingType,
      value: data.value,
      dueDate: data.dueDate?.substring(0, 10)
    });

    // Verificar se os dados necessários estão presentes
    if (!data.customer) {
      throw new Error('ID do cliente (customer) é obrigatório');
    }

    if (!data.value || data.value <= 0) {
      throw new Error('Valor deve ser maior que zero');
    }

    if (!data.dueDate) {
      throw new Error('Data de vencimento é obrigatória');
    }

    // Garantir que o valor tenha no máximo 2 casas decimais
    const valueFormatted = Number(Number(data.value).toFixed(2));

    const url = `${ASAAS_CONFIG.API_URL}/payments`;
    console.log('URL da API:', url);

    // Obter os headers de forma segura
    let headers;
    try {
      headers = ASAAS_CONFIG.getHeaders();
      console.log('Headers configurados:', {
        contentType: headers['Content-Type'],
        accept: headers['Accept'],
        hasAccessToken: !!headers['access_token'],
        tokenPrefix: headers['access_token'] ? headers['access_token'].substring(0, 5) : undefined
      });
    } catch (headerError) {
      console.error('Erro ao obter headers:', headerError);
      throw new Error('Erro de configuração: não foi possível obter headers da API');
    }

    // Adicionar configuração para desativar notificações
    const paymentData = {
      ...data,
      value: valueFormatted,
      postalService: false,
      // Garantir que a data de vencimento esteja no formato correto (YYYY-MM-DD)
      dueDate: data.dueDate.split('T')[0]
    };

    console.log('Dados do pagamento a serem enviados:', paymentData);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(paymentData),
        cache: 'no-store'
      });

      console.log('Status da resposta:', response.status, response.statusText);

      // Obter o corpo da resposta como texto para melhor diagnóstico
      const responseText = await response.text();
      console.log('Resposta recebida (parcial):', responseText.substring(0, 200));
      
      if (!responseText || responseText.trim() === '') {
        console.error('Resposta vazia recebida do servidor');
        throw new Error('Resposta vazia do servidor Asaas');
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erro ao processar resposta JSON:', parseError);
        throw new Error('Resposta inválida do servidor: ' + responseText.substring(0, 100));
      }

      if (!response.ok) {
        console.error('Erro na resposta do Asaas:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        
        let errorMessage = 'Erro ao criar pagamento';
        
        if (responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          errorMessage = responseData.errors.map((e: any) => e.description).join(', ');
        } else if (responseData.error) {
          errorMessage = responseData.error;
        }
        
        throw new Error(errorMessage);
      }

      console.log('Pagamento criado com sucesso:', {
        id: responseData.id,
        status: responseData.status
      });

      return responseData;
    } catch (fetchError) {
      console.error('Erro na requisição de criação de pagamento:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error('Erro detalhado ao criar pagamento:', error);
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

    // Usar o endpoint correto do Asaas
    const url = `${ASAAS_CONFIG.API_URL}/payments/${paymentId}`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Erro ao verificar status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Status verificado com sucesso:', {
      id: data.id,
      status: data.status
    });

    return {
      id: data.id,
      status: data.status || 'PENDING',
      value: data.value || 0,
      netValue: data.netValue || 0,
      description: data.description || 'Pagamento',
      billingType: data.billingType || 'PIX',
      confirmedDate: data.confirmedDate || null,
      paymentDate: data.paymentDate || null
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
      value: data.value,
      dueDate: data.dueDate
    });

    const url = `${ASAAS_CONFIG.API_URL}/payments`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? headers.access_token.substring(0, 10) + '...' : undefined
    });

    // Adicionar configuração para desativar notificações e garantir que o valor seja um número
    const paymentData = {
      customer: data.customer,
      billingType: 'BOLETO',
      value: Number(Number(data.value).toFixed(2)),
      dueDate: data.dueDate,
      description: data.description,
      postalService: false
    };

    console.log('Dados do boleto a serem enviados:', JSON.stringify(paymentData));

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentData),
      cache: 'no-store'
    });

    console.log('Status da resposta:', response.status, response.statusText);

    // Obter o texto da resposta
    const responseText = await response.text();
    console.log('Resposta recebida (primeiros 200 caracteres):', responseText.substring(0, 200));

    // Tentar converter para JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao processar resposta JSON:', e);
      throw new Error('Resposta inválida do servidor Asaas: ' + responseText.substring(0, 100));
    }
    
    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      const errorMessage = responseData.errors && responseData.errors.length > 0
        ? responseData.errors.map((e: any) => e.description).join(', ')
        : 'Erro ao criar boleto';
        
      throw new Error(errorMessage);
    }

    if (!responseData.id || !responseData.bankSlipUrl) {
      console.error('Resposta incompleta do Asaas:', responseData);
      throw new Error('Resposta incompleta do servidor Asaas');
    }

    console.log('Boleto criado com sucesso:', {
      id: responseData.id,
      status: responseData.status,
      bankSlipUrl: responseData.bankSlipUrl ? 'URL válida' : 'URL não encontrada'
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
    console.error('Erro detalhado ao criar boleto:', error);
    throw error;
  }
}

export async function getBoletoIdentification(paymentId: string): Promise<BoletoIdentification> {
  try {
    console.log('Obtendo linha digitável do boleto...', { paymentId });

    const url = `${ASAAS_CONFIG.API_URL}/payments/${paymentId}/identificationField`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados (token parcial):', {
      ...headers,
      access_token: headers.access_token ? headers.access_token.substring(0, 10) + '...' : undefined
    });

    // Adicionar um pequeno atraso para garantir que o boleto foi processado
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    console.log('Status da resposta:', response.status, response.statusText);

    // Obter o texto da resposta
    const responseText = await response.text();
    console.log('Resposta recebida (parcial):', responseText.substring(0, 100) + '...');

    // Tentar converter para JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao processar resposta JSON:', e);
      // Se falhar, retornar valores padrão para não bloquear o fluxo
      console.log('Retornando valores padrão para linha digitável');
      return {
        identificationField: "Linha digitável indisponível no momento",
        nossoNumero: "",
        barCode: ""
      };
    }

    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      // Se falhar, retornar valores padrão para não bloquear o fluxo
      console.log('Retornando valores padrão para linha digitável devido a erro');
      return {
        identificationField: "Linha digitável indisponível no momento",
        nossoNumero: "",
        barCode: ""
      };
    }

    console.log('Linha digitável obtida com sucesso');

    return {
      identificationField: responseData.identificationField || "Linha digitável indisponível",
      nossoNumero: responseData.nossoNumero || "",
      barCode: responseData.barCode || ""
    };
  } catch (error) {
    console.error('Erro ao obter linha digitável:', error);
    // Se falhar, retornar valores padrão para não bloquear o fluxo
    return {
      identificationField: "Linha digitável indisponível no momento",
      nossoNumero: "",
      barCode: ""
    };
  }
}

export interface PixQrCodeResponse {
  success: boolean;
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export async function getPixQrCode(paymentId: string): Promise<PixQrCodeResponse> {
  try {
    console.log(`Iniciando obtenção do QR Code PIX para pagamento ${paymentId}`);
    
    if (!paymentId) {
      throw new Error('ID do pagamento é obrigatório para gerar QR Code PIX');
    }
    
    const url = `${ASAAS_CONFIG.API_URL}/payments/${paymentId}/pixQrCode`;
    console.log('URL da API para QR Code:', url);
    
    let headers;
    try {
      headers = ASAAS_CONFIG.getHeaders();
      console.log('Headers configurados para QR Code:', {
        contentType: headers['Content-Type'],
        accept: headers['Accept'],
        hasAccessToken: !!headers['access_token']
      });
    } catch (headerError) {
      console.error('Erro ao obter headers para QR Code:', headerError);
      throw new Error('Erro de configuração: não foi possível obter headers da API');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    console.log('Status da resposta do QR Code:', response.status, response.statusText);
    
    // Obter o corpo da resposta como texto para melhor diagnóstico
    const responseText = await response.text();
    console.log('Resposta do QR Code recebida (parcial):', 
      responseText ? responseText.substring(0, 200) : 'Resposta vazia');
    
    if (!responseText || responseText.trim() === '') {
      console.error('Resposta vazia recebida do servidor para QR Code');
      throw new Error('Resposta vazia do servidor Asaas para QR Code');
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Erro ao processar resposta JSON do QR Code:', parseError);
      throw new Error('Resposta inválida do servidor para QR Code: ' + responseText.substring(0, 100));
    }

    if (!response.ok) {
      console.error('Erro na resposta do Asaas para QR Code:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      let errorMessage = 'Erro ao obter QR Code PIX';
      
      if (responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        errorMessage = responseData.errors.map((e: any) => e.description).join(', ');
      } else if (responseData.error) {
        errorMessage = responseData.error;
      }
      
      throw new Error(errorMessage);
    }

    console.log('QR Code PIX obtido com sucesso', {
      encodedImage: responseData.encodedImage ? 'presente' : 'ausente',
      payload: responseData.payload ? 'presente' : 'ausente',
      expirationDate: responseData.expirationDate
    });

    return responseData;
  } catch (error) {
    console.error('Erro detalhado ao obter QR Code PIX:', error);
    throw error;
  }
} 