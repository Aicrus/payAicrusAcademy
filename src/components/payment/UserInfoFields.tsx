'use client';

import { useState } from 'react';
import { usePayment } from '@/contexts/PaymentContext';
import { motion } from 'framer-motion';
import { UserIcon, EnvelopeIcon, PhoneIcon, DocumentTextIcon, PencilIcon } from '@heroicons/react/24/outline';
import { formatCPF, formatPhone } from '@/utils/format';

export default function UserInfoFields() {
  const { userInfo, setUserInfo, isInfoLocked, setIsInfoLocked } = usePayment();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInfo) return;

    setLoading(true);
    setError(null);

    try {
      if (!userInfo.name || !userInfo.email || !userInfo.cpf) {
        throw new Error('Por favor, preencha todos os campos obrigatórios');
      }

      const customerData = {
        name: userInfo.name,
        cpfCnpj: userInfo.cpf.replace(/\D/g, ''),
        email: userInfo.email,
        mobilePhone: userInfo.whatsapp.replace(/\D/g, ''),
        personType: userInfo.cpf.replace(/\D/g, '').length <= 11 ? 'FISICA' : 'JURIDICA'
      };

      // Se já tem ID, atualiza. Se não, cria novo.
      const response = await fetch(
        userInfo.asaasId 
          ? `/api/asaas/customers/${userInfo.asaasId}`
          : '/api/asaas/customers',
        {
          method: userInfo.asaasId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(customerData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar informações');
      }
      
      setUserInfo({
        ...userInfo,
        asaasId: data.id
      });

      setIsInfoLocked(true);
    } catch (err) {
      console.error('Erro ao processar cliente:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Erro ao processar suas informações. Tente novamente.'
      );
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
      value = formatPhone(value);
    }

    setUserInfo(prevInfo => ({
      ...(prevInfo || {
        name: '',
        email: '',
        cpf: '',
        whatsapp: ''
      }),
      [field]: value
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
              <span>{userInfo?.whatsapp}</span>
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
          <div className="mt-1 relative rounded-lg shadow-sm">
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
              placeholder="(00) 00000-0000"
              maxLength={15}
              className="block w-full pl-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
            />
          </div>
        </div>
      </div>

      {!isInfoLocked && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-[#0F2B1B] hover:bg-[#0F2B1B]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F2B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              'CONFIRMAR INFORMAÇÕES'
            )}
          </button>
        </motion.div>
      )}

      {error && (
        <div className="text-red-500 text-sm text-center">
          {error}
        </div>
      )}
    </form>
  );
} 