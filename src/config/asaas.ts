const getEnvVar = (name: string, isPublic = false): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não configurada. ` +
      `Configure ${isPublic ? 'na Vercel' : 'nas variáveis de ambiente'}.`
    );
  }

  // Validações adicionais de segurança
  if (name === 'ASAAS_ACCESS_TOKEN' && !value.startsWith('aact_')) {
    throw new Error('Token ASAAS inválido. O token deve começar com "aact_"');
  }

  if (name === 'PIX_ADDRESS_KEY' && !value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
    throw new Error('Chave PIX inválida. Deve ser um UUID válido');
  }

  return value;
};

export const ASAAS_CONFIG = {
  API_URL: getEnvVar('NEXT_PUBLIC_ASAAS_API_URL', true),
  getAccessToken: () => getEnvVar('ASAAS_ACCESS_TOKEN'),
  getPixKey: () => getEnvVar('PIX_ADDRESS_KEY'),
  getHeaders: () => {
    try {
      console.log('Obtendo token de acesso Asaas...');
      const accessToken = getEnvVar('ASAAS_ACCESS_TOKEN');
      console.log('Token obtido:', accessToken ? `${accessToken.substring(0, 5)}...` : 'VAZIO');
      
      // Validar o token
      if (!accessToken) {
        throw new Error('Token de acesso Asaas não encontrado ou vazio');
      }
      
      if (!accessToken.startsWith('$') && !accessToken.startsWith('aact_')) {
        console.error('Token ASAAS inválido. O token deve começar com "$" ou "aact_"');
        throw new Error('Formato de token Asaas inválido');
      }

      // Formatar o token corretamente
      const formattedToken = accessToken.startsWith('$') 
        ? accessToken 
        : accessToken.startsWith('aact_')
          ? `$${accessToken}`
          : accessToken;
          
      console.log('Token formatado:', formattedToken ? `${formattedToken.substring(0, 5)}...` : 'VAZIO');

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'access_token': formattedToken
      };
      
      console.log('Headers gerados com sucesso para API Asaas');
      return headers;
    } catch (error) {
      console.error('Erro ao gerar headers para API Asaas:', error);
      throw error;
    }
  }
} as const; 