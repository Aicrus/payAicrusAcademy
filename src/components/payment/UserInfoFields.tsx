'use client';

import { useState, useEffect } from 'react';
import { usePayment } from '@/contexts/PaymentContext';
import { motion } from 'framer-motion';
import { UserIcon, EnvelopeIcon, PhoneIcon, DocumentTextIcon, PencilIcon } from '@heroicons/react/24/outline';
import { formatCPF, formatPhone, joinPhoneWithDialCode } from '@/utils/format';
import CountryCodeSelect from '@/components/ui/CountryCodeSelect';

export default function UserInfoFields() {
  const { userInfo, setUserInfo, isInfoLocked, setIsInfoLocked } = usePayment();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar se o cliente existe e não foi excluído ao carregar o componente
  useEffect(() => {
    const verifyCustomer = async () => {
      if (userInfo?.asaasId) {
        try {
          const response = await fetch(`/api/asaas/customers/${userInfo.asaasId}`, {
            method: 'GET',
          });
          
          if (!response.ok) {
            const data = await response.json();
            
            // Se o cliente foi excluído ou não existe, limpar o ID
            if (response.status === 404 || (data.error && data.error.includes('Cliente excluído'))) {
              console.log('Cliente excluído ou não encontrado, limpando ID:', userInfo.asaasId);
              setUserInfo({
                ...userInfo,
                asaasId: undefined
              });
              setIsInfoLocked(false);
            }
          }
        } catch (err) {
          console.error('Erro ao verificar cliente:', err);
        }
      }
    };
    
    verifyCustomer();
  }, [userInfo?.asaasId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInfo) return;

    setLoading(true);
    setError(null);

    try {
      if (!userInfo.name || !userInfo.email || !userInfo.cpf) {
        throw new Error('Por favor, preencha todos os campos obrigatórios');
      }

      // Formatar o número de telefone com o código internacional para o Asaas
      const formattedPhone = userInfo.whatsapp.replace(/\D/g, '');
      const completePhone = userInfo.dialCode + formattedPhone;

      const customerData = {
        name: userInfo.name,
        cpfCnpj: userInfo.cpf.replace(/\D/g, ''),
        email: userInfo.email,
        mobilePhone: formattedPhone,
        phone: completePhone,
        personType: userInfo.cpf.replace(/\D/g, '').length <= 11 ? 'FISICA' : 'JURIDICA'
      };

      // Se não tem ID ou se o ID foi limpo (cliente excluído), criar novo
      if (!userInfo.asaasId) {
        console.log('Criando novo cliente (sem ID ou ID limpo)');
        const createResponse = await fetch('/api/asaas/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(customerData)
        });
        
        const createData = await createResponse.json();
        
        if (!createResponse.ok) {
          throw new Error(createData.error || 'Erro ao criar cliente');
        }
        
        setUserInfo({
          ...userInfo,
          asaasId: createData.id
        });
        
        setIsInfoLocked(true);
        return;
      }

      // Se tem ID, tentar atualizar
      const response = await fetch(
        `/api/asaas/customers/${userInfo.asaasId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(customerData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Verificar se é um erro de cliente excluído
        if (data.error && (data.error.includes('Cliente excluído') || data.error.includes('não encontrado'))) {
          console.log('Cliente excluído ou não encontrado, criando novo cliente');
          
          // Limpar o ID do cliente
          setUserInfo(prevInfo => ({
            ...(prevInfo || {
              name: '',
              email: '',
              cpf: '',
              whatsapp: '',
              dialCode: '+55'
            }),
            asaasId: undefined
          }));
          
          // Criar novo cliente
          const createResponse = await fetch('/api/asaas/customers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(customerData)
          });
          
          const createData = await createResponse.json();
          
          if (!createResponse.ok) {
            throw new Error(createData.error || 'Erro ao criar novo cliente');
          }
          
          // Atualizar o ID do cliente
          setUserInfo(prevInfo => ({
            ...(prevInfo || {
              name: '',
              email: '',
              cpf: '',
              whatsapp: '',
              dialCode: '+55'
            }),
            asaasId: createData.id
          }));
          
          setIsInfoLocked(true);
          return;
        }
        
        throw new Error(data.error || 'Erro ao processar informações');
      }
      
      setUserInfo({
        ...userInfo,
        asaasId: data.id
      });

      setIsInfoLocked(true);
    } catch (err) {
      console.error('Erro ao processar cliente:', err);
      
      // Mensagem de erro mais amigável para o usuário
      let errorMessage = 'Erro ao processar suas informações. Tente novamente.';
      
      if (err instanceof Error) {
        if (err.message.includes('Cliente excluído')) {
          errorMessage = 'Este cadastro foi excluído anteriormente. Por favor, preencha novamente seus dados.';
        } else if (err.message.includes('não encontrado')) {
          errorMessage = 'Cadastro não encontrado. Por favor, preencha novamente seus dados.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      
      // Se for um erro de cliente excluído ou não encontrado, liberar os campos para edição
      if (
        err instanceof Error && 
        (err.message.includes('Cliente excluído') || err.message.includes('não encontrado'))
      ) {
        setIsInfoLocked(false);
        // Limpar o ID do cliente para forçar a criação de um novo
        setUserInfo(prevInfo => ({
          ...(prevInfo || {
            name: '',
            email: '',
            cpf: '',
            whatsapp: '',
            dialCode: '+55'
          }),
          asaasId: undefined
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    // Agora apenas liberamos a edição
    setIsInfoLocked(false);
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isInfoLocked) return;

    let value = e.target.value;

    if (field === 'cpf') {
      value = formatCPF(value);
    } else if (field === 'whatsapp') {
      // Formatar apenas o número, sem o código do país
      const isBrazilian = userInfo?.dialCode === '+55';
      value = formatPhone(value, isBrazilian);
    }

    setUserInfo(prevInfo => ({
      ...(prevInfo || {
        name: '',
        email: '',
        cpf: '',
        whatsapp: '',
        dialCode: '+55'
      }),
      [field]: value
    }));
  };

  const handleDialCodeChange = (dialCode: string) => {
    if (isInfoLocked) return;
    
    setUserInfo(prevInfo => ({
      ...(prevInfo || {
        name: '',
        email: '',
        cpf: '',
        whatsapp: '',
        dialCode: '+55'
      }),
      dialCode
    }));
  };

  if (isInfoLocked) {
    return (
      <motion.div
        className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Suas Informações</h3>
            <button
              onClick={handleEdit}
              disabled={loading}
              className="inline-flex items-center text-sm text-gray-500 hover:text-[#0F2B1B] disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F2B1B]" />
              ) : (
                <>
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Editar
                </>
              )}
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span>{userInfo?.name}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span>{userInfo?.cpf}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span>{userInfo?.email}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span>{joinPhoneWithDialCode(userInfo?.dialCode || '+55', userInfo?.whatsapp || '')}</span>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500">
          Suas informações estão seguras e criptografadas
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Informações Pessoais
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Preencha seus dados para continuar com o pagamento
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nome Completo
          </label>
          <div className="mt-1 relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="name"
              name="name"
              required
              disabled={isInfoLocked}
              value={userInfo?.name || ''}
              onChange={handleInputChange('name')}
              placeholder="Digite seu nome completo"
              className="block w-full pl-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">
            CPF/CNPJ
          </label>
          <div className="mt-1 relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="cpf"
              name="cpf"
              required
              disabled={isInfoLocked}
              value={userInfo?.cpf || ''}
              onChange={handleInputChange('cpf')}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              maxLength={18}
              className="block w-full pl-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-mail
          </label>
          <div className="mt-1 relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              required
              disabled={isInfoLocked}
              value={userInfo?.email || ''}
              onChange={handleInputChange('email')}
              placeholder="seu@email.com"
              className="block w-full pl-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
            WhatsApp
          </label>
          <div className="mt-1 flex rounded-lg shadow-sm">
            <CountryCodeSelect 
              value={userInfo?.dialCode || '+55'} 
              onChange={handleDialCodeChange}
              disabled={isInfoLocked}
            />
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="whatsapp"
                name="whatsapp"
                required
                disabled={isInfoLocked}
                value={userInfo?.whatsapp || ''}
                onChange={handleInputChange('whatsapp')}
                placeholder={userInfo?.dialCode === '+55' ? "(00) 00000-0000" : "000 000 0000"}
                className="block w-full pl-10 rounded-r-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Selecione o código do país antes do número
          </p>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#0F2B1B] hover:bg-[#1a4a30] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F2B1B] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            'Confirmar Informações'
          )}
        </button>
      </div>
    </form>
  );
} 