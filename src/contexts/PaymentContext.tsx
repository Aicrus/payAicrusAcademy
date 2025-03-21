'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserInfoService } from '@/services/userInfo';

interface UserInfo {
  name: string;
  email: string;
  cpf: string;
  whatsapp: string;
  dialCode: string;
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
      const cachedInfo = UserInfoService.getFromCache();
      // Adicionar dialCode se não existir no cache
      if (cachedInfo) {
        return {
          name: cachedInfo.name,
          email: cachedInfo.email,
          cpf: cachedInfo.cpf,
          whatsapp: cachedInfo.whatsapp,
          dialCode: cachedInfo.dialCode || '+55',
          asaasId: cachedInfo.asaasId
        };
      }
      return null;
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
    if (typeof info === 'function') {
      setUserInfoState((prevState) => {
        const newInfo = info(prevState);
        // Garantir que dialCode sempre tenha um valor padrão
        if (!newInfo.dialCode) {
          return { ...newInfo, dialCode: '+55' };
        }
        return newInfo;
      });
    } else {
      // Garantir que dialCode sempre tenha um valor padrão
      if (!info.dialCode) {
        setUserInfoState({ ...info, dialCode: '+55' });
      } else {
        setUserInfoState(info);
      }
    }
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