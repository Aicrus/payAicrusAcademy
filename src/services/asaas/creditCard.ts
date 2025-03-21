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
  observationToCustomer?: string;
}

export interface TokenizeCardData {
  customer: string;
  creditCard: CreditCardInfo;
  creditCardHolderInfo: CreditCardHolderInfo;
  remoteIp: string;
}

export interface TokenizeCardResponse {
  creditCardToken: string;
  creditCardNumber: string;
  creditCardBrand: string;
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
  callback?: {
    successUrl: string;
    autoRedirect: boolean;
  };
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
    // Validações básicas
    if (!data.creditCard.number || data.creditCard.number.replace(/\D/g, '').length < 13) {
      throw new Error('Número do cartão inválido');
    }

    if (!data.creditCard.holderName || data.creditCard.holderName.length < 3) {
      throw new Error('Nome do titular inválido');
    }

    if (!data.creditCard.ccv || data.creditCard.ccv.length < 3) {
      throw new Error('Código de segurança inválido');
    }

    if (!data.creditCardHolderInfo.cpfCnpj || data.creditCardHolderInfo.cpfCnpj.length < 11) {
      throw new Error('CPF inválido');
    }

    if (!data.creditCardHolderInfo.postalCode || data.creditCardHolderInfo.postalCode.length < 8) {
      throw new Error('CEP inválido');
    }

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

    // Preparar dados do pagamento
    const paymentData = {
      ...data,
      postalService: false,
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

      // Tratamento específico de erros do Asaas
      if (responseData.errors && responseData.errors.length > 0) {
        const asaasError = responseData.errors[0];
        let errorMessage = asaasError.description || 'Erro ao processar pagamento';

        // Traduzir mensagens comuns de erro
        if (errorMessage.includes('card number is invalid')) {
          errorMessage = 'Número do cartão inválido';
        } else if (errorMessage.includes('card expired')) {
          errorMessage = 'Cartão expirado';
        } else if (errorMessage.includes('insufficient funds')) {
          errorMessage = 'Saldo insuficiente';
        } else if (errorMessage.includes('unauthorized')) {
          errorMessage = 'Transação não autorizada. Verifique os dados do cartão de crédito e tente novamente.';
        }

        throw new Error(errorMessage);
      }

      throw new Error('Erro ao processar pagamento. Por favor, tente novamente.');
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

export async function tokenizeCreditCard(data: TokenizeCardData): Promise<TokenizeCardResponse> {
  try {
    // Validações básicas
    if (!data.creditCard.number || data.creditCard.number.replace(/\D/g, '').length < 13) {
      throw new Error('Número do cartão inválido');
    }

    if (!data.creditCard.holderName || data.creditCard.holderName.length < 3) {
      throw new Error('Nome do titular inválido');
    }

    if (!data.creditCard.ccv || data.creditCard.ccv.length < 3) {
      throw new Error('Código de segurança inválido');
    }

    if (!data.creditCardHolderInfo.cpfCnpj || data.creditCardHolderInfo.cpfCnpj.length < 11) {
      throw new Error('CPF inválido');
    }

    if (!data.creditCardHolderInfo.postalCode || data.creditCardHolderInfo.postalCode.length < 8) {
      throw new Error('CEP inválido');
    }

    console.log('Iniciando tokenização de cartão de crédito...', {
      customer: data.customer
    });

    const url = `${ASAAS_CONFIG.API_URL}/creditCard/tokenize`;
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

      // Tratamento específico de erros do Asaas
      if (responseData.errors && responseData.errors.length > 0) {
        const asaasError = responseData.errors[0];
        let errorMessage = asaasError.description || 'Erro ao tokenizar cartão';

        // Traduzir mensagens comuns de erro
        if (errorMessage.includes('card number is invalid')) {
          errorMessage = 'Número do cartão inválido';
        } else if (errorMessage.includes('card expired')) {
          errorMessage = 'Cartão expirado';
        } else if (errorMessage.includes('unauthorized')) {
          errorMessage = 'Tokenização não autorizada. Verifique os dados do cartão de crédito e tente novamente.';
        }

        throw new Error(errorMessage);
      }

      throw new Error('Erro ao tokenizar cartão. Por favor, tente novamente.');
    }

    console.log('Cartão tokenizado com sucesso');

    return {
      creditCardToken: responseData.creditCardToken,
      creditCardNumber: responseData.creditCardNumber,
      creditCardBrand: responseData.creditCardBrand
    };
  } catch (error) {
    console.error('Erro ao tokenizar cartão:', error);
    throw error;
  }
}

export interface TokenizedPaymentData {
  customer: string;
  billingType: 'CREDIT_CARD';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value: number;
    dueDateLimitDays: number;
    type: string;
  };
  creditCardToken: string;
  remoteIp: string;
  callback?: {
    successUrl: string;
    autoRedirect: boolean;
  };
}

export async function createTokenizedPayment(data: TokenizedPaymentData): Promise<CreditCardPayment> {
  try {
    console.log('Iniciando pagamento com token de cartão...', {
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

    // Preparar dados do pagamento
    const paymentData = {
      ...data,
      postalService: false
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

      // Tratamento específico de erros do Asaas
      if (responseData.errors && responseData.errors.length > 0) {
        const asaasError = responseData.errors[0];
        let errorMessage = asaasError.description || 'Erro ao processar pagamento';

        throw new Error(errorMessage);
      }

      throw new Error('Erro ao processar pagamento. Por favor, tente novamente.');
    }

    console.log('Pagamento com token criado com sucesso:', {
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
    console.error('Erro ao processar pagamento com token:', error);
    throw error;
  }
} 