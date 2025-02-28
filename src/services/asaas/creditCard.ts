import { ASAAS_CONFIG } from '@/config/asaas';

export interface CreditCardInfo {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
  mobilePhone: string;
}

export interface CreditCardPaymentData {
  customer: string;
  billingType: 'CREDIT_CARD';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  creditCard: CreditCardInfo;
  creditCardHolderInfo: CreditCardHolderInfo;
  installmentCount?: number;
  installmentValue?: number;
  remoteIp: string;
}

export interface CreditCardPayment {
  id: string;
  status: string;
  value: number;
  netValue: number;
  description: string;
  installmentCount?: number;
  installmentValue?: number;
  dueDate: string;
  confirmedDate: string | null;
}

export async function createCreditCardPayment(data: CreditCardPaymentData): Promise<CreditCardPayment> {
  try {
    console.log('Iniciando pagamento com cartão de crédito...', {
      customer: data.customer,
      value: data.value,
      installmentCount: data.installmentCount
    });

    const url = `${ASAAS_CONFIG.API_URL}/payments`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? '***' : undefined
    });

    // Adicionar callback URL
    const paymentData = {
      ...data,
      callback: {
        successUrl: process.env.NEXT_PUBLIC_SUCCESS_URL || 'https://www.aicrustech.com/',
        autoRedirect: true
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentData)
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      throw new Error(responseData.errors?.[0]?.description || 'Erro ao processar pagamento');
    }

    console.log('Pagamento criado com sucesso:', {
      id: responseData.id,
      status: responseData.status
    });

    return {
      id: responseData.id,
      status: responseData.status,
      value: responseData.value,
      netValue: responseData.netValue,
      description: responseData.description,
      installmentCount: responseData.installmentCount,
      installmentValue: responseData.installmentValue,
      dueDate: responseData.dueDate,
      confirmedDate: responseData.confirmedDate
    };
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    throw error;
  }
}

export async function checkCreditCardPaymentStatus(paymentId: string): Promise<CreditCardPayment> {
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
      installmentCount: data.installmentCount,
      installmentValue: data.installmentValue,
      dueDate: data.dueDate,
      confirmedDate: data.confirmedDate
    };
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    throw error;
  }
} 