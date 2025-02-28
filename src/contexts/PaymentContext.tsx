'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserInfoService } from '@/services/userInfo';

interface UserInfo {
  name: string;
  email: string;
  cpf: string;
  whatsapp: string;
  asaasId?: string;
}

interface PaymentContextData {
  userInfo: UserInfo | null;
  setUserInfo: (info: UserInfo | ((prevInfo: UserInfo | null) => UserInfo)) => void;
  isInfoLocked: boolean;
  setIsInfoLocked: (locked: boolean) => void;
}

const PaymentContext = createContext<PaymentContextData>({} as PaymentContextData);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [userInfo, setUserInfoState] = useState<UserInfo | null>(() => {
    // Carregar dados do cache ao inicializar
    if (typeof window !== 'undefined') {
      return UserInfoService.getFromCache();
    }
    return null;
  });
  const [isInfoLocked, setIsInfoLocked] = useState(false);

  // Atualizar cache quando userInfo mudar
  useEffect(() => {
    if (userInfo) {
      UserInfoService.saveToCache(userInfo);
    }
  }, [userInfo]);

  const setUserInfo = (info: UserInfo | ((prevInfo: UserInfo | null) => UserInfo)) => {
    setUserInfoState(info);
  };

  return (
    <PaymentContext.Provider
      value={{
        userInfo,
        setUserInfo,
        isInfoLocked,
        setIsInfoLocked,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment() {
  const context = useContext(PaymentContext);

  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }

  return context;
} 