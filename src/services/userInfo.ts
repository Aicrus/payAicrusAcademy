const USER_INFO_CACHE_KEY = 'userInfo';

interface UserInfo {
  name: string;
  email: string;
  cpf: string;
  whatsapp: string;
  asaasId?: string;
}

export const UserInfoService = {
  saveToCache(userInfo: UserInfo): void {
    try {
      // Verificar se o ID do cliente foi removido (cliente excluído)
      const currentCache = this.getFromCache();
      
      // Se o ID do cliente foi removido, limpar o cache completamente
      if (currentCache?.asaasId && !userInfo.asaasId) {
        console.log('ID do cliente removido, limpando cache');
        this.clearCache();
        return;
      }
      
      // Se o email foi alterado, atualizar o cache com o novo ID
      if (currentCache?.email !== userInfo.email && userInfo.asaasId) {
        console.log('Email alterado, atualizando cache com novo ID');
      }
      
      // Verificar se os dados são válidos antes de salvar
      if (!userInfo.name || !userInfo.email || !userInfo.cpf) {
        console.log('Dados incompletos, não salvando no cache');
        return;
      }
      
      localStorage.setItem(USER_INFO_CACHE_KEY, JSON.stringify(userInfo));
      console.log('Dados salvos no cache:', {
        name: userInfo.name,
        email: userInfo.email,
        asaasId: userInfo.asaasId
      });
    } catch (error) {
      console.error('Erro ao salvar informações no cache:', error);
    }
  },

  getFromCache(): UserInfo | null {
    try {
      const cached = localStorage.getItem(USER_INFO_CACHE_KEY);
      if (!cached) {
        return null;
      }
      
      const parsedCache = JSON.parse(cached);
      
      // Verificar se os dados são válidos
      if (!parsedCache.name || !parsedCache.email || !parsedCache.cpf) {
        console.log('Dados inválidos no cache, limpando');
        this.clearCache();
        return null;
      }
      
      return parsedCache;
    } catch (error) {
      console.error('Erro ao recuperar informações do cache:', error);
      // Se houver erro ao ler o cache, limpar para evitar problemas futuros
      this.clearCache();
      return null;
    }
  },

  clearCache(): void {
    try {
      console.log('Limpando cache de informações do usuário');
      localStorage.removeItem(USER_INFO_CACHE_KEY);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  },
  
  // Método para verificar se o cliente no cache foi excluído
  async verifyCustomerStatus(asaasId: string): Promise<boolean> {
    try {
      if (!asaasId) {
        return false;
      }
      
      console.log('Verificando status do cliente:', asaasId);
      const response = await fetch(`/api/asaas/customers/${asaasId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        console.log('Cliente não encontrado ou excluído, limpando cache');
        this.clearCache();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar status do cliente:', error);
      return false;
    }
  }
}; 