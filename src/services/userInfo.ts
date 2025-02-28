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
    localStorage.setItem(USER_INFO_CACHE_KEY, JSON.stringify(userInfo));
  },

  getFromCache(): UserInfo | null {
    const cached = localStorage.getItem(USER_INFO_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  },

  clearCache(): void {
    localStorage.removeItem(USER_INFO_CACHE_KEY);
  }
}; 