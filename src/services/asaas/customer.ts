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
  deleted?: boolean;
  // ... outros campos retornados pela API
}

// Função para verificar se um cliente existe e não foi excluído
export async function getCustomer(id: string): Promise<Customer | null> {
  try {
    console.log('Verificando cliente no Asaas:', { id });

    const url = `${ASAAS_CONFIG.API_URL}/customers/${id}`;
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

    // Se o cliente não existir, a API retorna 404
    if (response.status === 404) {
      console.log('Cliente não encontrado:', { id });
      return null;
    }

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      return null;
    }

    // Verificar se o cliente foi excluído
    if (responseData.deleted) {
      console.log('Cliente encontrado, mas está excluído:', { id });
      return responseData;
    }

    console.log('Cliente encontrado e ativo:', {
      id: responseData.id,
      name: responseData.name
    });

    return responseData;
  } catch (error) {
    console.error('Erro ao verificar cliente:', error);
    return null;
  }
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

    // Verificar se o cliente existe e não foi excluído
    const existingCustomer = await getCustomer(id);
    
    if (!existingCustomer) {
      throw new Error('Cliente não encontrado. Não é possível fazer alterações.');
    }
    
    if (existingCustomer.deleted) {
      throw new Error(`O cliente [${id}] não pode ser atualizado: Cliente excluído, não é possível fazer alterações.`);
    }

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