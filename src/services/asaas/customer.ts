import { ASAAS_CONFIG } from '@/config/asaas';

export interface CustomerData {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  personType?: 'FISICA' | 'JURIDICA';
  notificationDisabled?: boolean;
}

export interface Customer {
  object: 'customer';
  id: string;
  dateCreated: string;
  name: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
  personType: 'FISICA' | 'JURIDICA';
  // ... outros campos retornados pela API
}

export async function createCustomer(data: CustomerData): Promise<Customer> {
  try {
    console.log('Iniciando criação de cliente no Asaas:', {
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj,
      personType: data.personType
    });

    const url = `${ASAAS_CONFIG.API_URL}/customers`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? '***' : undefined
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...data,
        personType: data.personType || 'FISICA',
        country: 'Brasil',
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });

      throw new Error(
        responseData.errors?.[0]?.description || 
        responseData.message || 
        'Falha ao criar cliente no Asaas'
      );
    }

    console.log('Cliente criado com sucesso:', {
      id: responseData.id,
      name: responseData.name
    });

    return responseData;
  } catch (error) {
    console.error('Erro detalhado ao criar cliente:', error);
    throw error;
  }
}

export async function updateCustomer(id: string, data: CustomerData): Promise<Customer> {
  try {
    console.log('Iniciando atualização de cliente no Asaas:', {
      id,
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj
    });

    const url = `${ASAAS_CONFIG.API_URL}/customers/${id}`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? '***' : undefined
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });

      throw new Error(
        responseData.errors?.[0]?.description || 
        responseData.message || 
        'Falha ao atualizar cliente no Asaas'
      );
    }

    console.log('Cliente atualizado com sucesso:', {
      id: responseData.id,
      name: responseData.name
    });

    return responseData;
  } catch (error) {
    console.error('Erro detalhado ao atualizar cliente:', error);
    throw error;
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    console.log('Iniciando exclusão de cliente no Asaas:', { id });

    const url = `${ASAAS_CONFIG.API_URL}/customers/${id}`;
    console.log('URL da API:', url);

    const headers = ASAAS_CONFIG.getHeaders();
    console.log('Headers configurados:', {
      ...headers,
      access_token: headers.access_token ? '***' : undefined
    });

    const response = await fetch(url, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const responseData = await response.json();
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });

      throw new Error(
        responseData.errors?.[0]?.description || 
        responseData.message || 
        'Falha ao excluir cliente no Asaas'
      );
    }

    console.log('Cliente excluído com sucesso:', { id });
  } catch (error) {
    console.error('Erro detalhado ao excluir cliente:', error);
    throw error;
  }
} 