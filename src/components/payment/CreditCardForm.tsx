'use client';

import { useState, useEffect } from 'react';
import { usePayment } from '@/contexts/PaymentContext';
import { 
  CreditCardIcon, 
  ChevronDownIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useProduto } from '@/contexts/ProdutoContext';
import { useParcelamento } from '@/hooks/useParcelamento';
import { TransactionService } from '@/services/transaction';
import { formatarCPF, formatarTelefone, formatarCEP, formatarMoeda } from '@/utils/formatters';
import { detectCardBrand, formatCardNumber, CardBrand } from '@/utils/cardUtils';
import Image from 'next/image';
import type { TransactionData } from '@/services/transaction';
import PaymentStatus from './PaymentStatus';

interface CreditCardFormData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  cpf: string;
  postalCode: string;
  addressNumber: string;
  addressComplement: string;
  phone: string;
}

interface CreditCardPaymentResponse {
  paymentId: string;
  status: string;
  value: number;
  netValue: number;
  description: string;
  installmentCount?: number;
  installmentValue?: number;
  dueDate: string;
  confirmedDate: string | null;
}

interface CreditCardFormProps {
  discountApplied: boolean;
  onProcessingStart: () => void;
  onProcessingEnd: () => void;
}

export default function CreditCardForm({ discountApplied, onProcessingStart, onProcessingEnd }: CreditCardFormProps) {
  const { userInfo, isInfoLocked } = usePayment();
  const { produto } = useProduto();
  
  // Valor que será usado para o cartão (com ou sem desconto)
  const valorCartao = discountApplied && produto ? produto.valorDesconto : (produto?.valor || 0);
  const { podeParcelar, parcelas } = useParcelamento(valorCartao);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState(1);
  const [cardBrand, setCardBrand] = useState<CardBrand>('unknown');
  const [formData, setFormData] = useState<CreditCardFormData>({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    cpf: '',
    postalCode: '',
    addressNumber: '',
    addressComplement: '',
    phone: ''
  });
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [lgpdConsent] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<{
    id: string;
    status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH';
  } | null>(null);

  useEffect(() => {
    const checkCardFieldsComplete = () => {
      return (
        formData.holderName.trim() !== '' &&
        formData.number.replace(/\D/g, '').length >= 13 &&
        formData.expiryMonth !== '' &&
        formData.expiryYear !== '' &&
        formData.ccv.length === 3
      );
    };

    setShowAdditionalFields(checkCardFieldsComplete());
  }, [formData.holderName, formData.number, formData.expiryMonth, formData.expiryYear, formData.ccv]);

  useEffect(() => {
    if (userInfo) {
      setFormData(prev => ({
        ...prev,
        cpf: userInfo.cpf || '',
        phone: userInfo.whatsapp || ''
      }));
    }
  }, [userInfo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    switch (name) {
      case 'number':
        formattedValue = value.replace(/\D/g, '').substring(0, 16);
        setCardBrand(detectCardBrand(formattedValue));
        formattedValue = formatCardNumber(formattedValue);
        break;
      case 'cpf':
        formattedValue = formatarCPF(value);
        break;
      case 'phone':
        formattedValue = formatarTelefone(value);
        break;
      case 'postalCode':
        formattedValue = formatarCEP(value);
        break;
      case 'ccv':
        formattedValue = value.replace(/\D/g, '').substring(0, 3);
        break;
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userInfo) {
      setError('Por favor, preencha seus dados pessoais primeiro');
      return;
    }

    if (!userInfo.asaasId) {
      setError('ID do cliente não encontrado. Por favor, preencha seus dados pessoais novamente.');
      return;
    }

    if (!produto) {
      setError('Erro ao carregar informações do produto');
      return;
    }

    // Validar consentimento LGPD
    if (!lgpdConsent) {
      setError('É necessário aceitar os termos de uso e política de privacidade para continuar');
      return;
    }

    // Validar valor mínimo
    if (valorCartao < 5) {
      setError('O valor mínimo para pagamento com cartão é de R$ 5,00');
      return;
    }

    setLoading(true);
    setError(null);
    onProcessingStart();

    try {
      // Buscar usuário no Supabase
      const response = await fetch(`/api/asaas/customers/${userInfo.asaasId}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar informações do usuário');
      }
      const userData = await response.json();

      // Validar se o usuário foi encontrado e tem ID
      if (!userData || !userData.id) {
        console.error('Dados do usuário inválidos:', userData);
        throw new Error('Usuário não encontrado no sistema');
      }

      // Buscar transação pendente existente
      const response2 = await fetch(`/api/transactions/pending/${userData.id}`);
      let transaction = null;
      
      if (response2.ok) {
        let pendingTransaction = await response2.json();
        if (pendingTransaction && pendingTransaction.id) {
          console.log('Transação pendente encontrada:', pendingTransaction);
          
          // Verificar se o valor da transação está atualizado com o valor atual
          const valorAtualizado = pendingTransaction.valor === valorCartao;
          
          if (!valorAtualizado) {
            console.log('Valor do produto foi alterado, atualizando transação:', {
              valorAntigo: pendingTransaction.valor,
              valorNovo: valorCartao
            });
          }
          
          // Atualizar transação existente para cartão
          try {
            await TransactionService.updateTransaction(pendingTransaction.id, {
              valor: valorCartao,
              produto: produto.id,
              metodoPagamento: 'CREDIT_CARD',
              metaData: {
                ...pendingTransaction.metaData,
                produto: {
                  valor: valorCartao
                },
                valorAtualizado: true
              }
            });
            
            transaction = pendingTransaction;
            console.log('Transação atualizada para cartão:', {
              id: transaction.id,
              valorAtualizado: valorCartao
            });
          } catch (updateError) {
            console.error('Erro ao atualizar valor da transação:', updateError);
            // Se falhar em atualizar, criar nova transação
            pendingTransaction = null;
          }
        }
      }

      // Se não encontrou transação pendente, cria uma nova
      if (!transaction) {
        const transactionData: TransactionData = {
          valor: valorCartao,
          status: 'PENDING',
          metodoPagamento: 'CREDIT_CARD',
          users: userData.id,
          produto: produto.id,
          idCustomerAsaas: userInfo.asaasId,
          metaData: {
            cpf: userInfo.cpf,
            name: userInfo.name,
            email: userInfo.email,
            asaasId: userInfo.asaasId,
            produto: {
              valor: valorCartao
            },
            dialCode: userInfo.dialCode,
            whatsapp: userInfo.whatsapp
          }
        };

        console.log('Criando nova transação com dados:', transactionData);
        
        transaction = await TransactionService.createTransaction(transactionData);
        
        if (!transaction || !transaction.id) {
          throw new Error('Falha ao criar transação: ID não retornado');
        }
      }

      const parcelaInfo = parcelas[selectedInstallment - 1];
      
      // Validações adicionais antes de enviar
      const cardNumber = formData.number.replace(/\D/g, '');
      if (cardNumber.length < 13 || cardNumber.length > 16) {
        setError('Número do cartão inválido. Por favor, verifique.');
        setLoading(false);
        return;
      }

      if (formData.ccv.length < 3) {
        setError('Código de segurança (CVV) inválido. Por favor, verifique.');
        setLoading(false);
        return;
      }

      if (formData.cpf.replace(/\D/g, '').length !== 11) {
        setError('CPF inválido. Por favor, verifique.');
        setLoading(false);
        return;
      }

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const expiryYear = parseInt(formData.expiryYear);
      const expiryMonth = parseInt(formData.expiryMonth);

      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        setError('Cartão expirado. Por favor, use um cartão válido.');
        setLoading(false);
        return;
      }

      try {
        // Passo 1: Preparar dados para tokenização
        const tokenizeData = {
          customer: userInfo.asaasId,
          creditCard: {
            holderName: formData.holderName,
            number: cardNumber,
            expiryMonth: formData.expiryMonth,
            expiryYear: formData.expiryYear,
            ccv: formData.ccv
          },
          creditCardHolderInfo: {
            name: formData.holderName,
            email: userInfo.email,
            cpfCnpj: formData.cpf.replace(/\D/g, ''),
            postalCode: formData.postalCode.replace(/\D/g, ''),
            addressNumber: formData.addressNumber,
            addressComplement: formData.addressComplement || undefined,
            phone: formData.phone.replace(/\D/g, ''),
            mobilePhone: formData.phone.replace(/\D/g, '')
          },
          usersAicrusAcademy: userData.id
        };

        console.log('Dados para tokenização:', {
          ...tokenizeData,
          creditCard: {
            ...tokenizeData.creditCard,
            number: '****' + tokenizeData.creditCard.number.slice(-4),
            ccv: '***'
          }
        });

        // Passo 2: Tokenizar o cartão
        const responseTokenize = await fetch('/api/asaas/credit-card/tokenize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tokenizeData)
        });

        if (!responseTokenize.ok) {
          const errorTokenize = await responseTokenize.json();
          throw new Error(errorTokenize.error || 'Erro ao tokenizar cartão');
        }

        const tokenData = await responseTokenize.json();
        console.log('Cartão tokenizado com sucesso:', {
          creditCardToken: tokenData.creditCardToken,
          creditCardNumber: tokenData.creditCardNumber,
          creditCardBrand: tokenData.creditCardBrand
        });

        // Passo 3: Fazer pagamento usando o token
        const paymentData = {
          customerId: userInfo.asaasId,
          description: `Assinatura Aicrus Academy - ${userInfo.email}`,
          value: parcelaInfo.valorTotal,
          creditCardToken: tokenData.creditCardToken,
          installmentCount: selectedInstallment,
          installmentValue: parcelaInfo.valorParcela,
          transactionId: transaction.id
        };

        console.log('Dados do pagamento com token:', paymentData);

        const responseCreditCard = await fetch('/api/payments/tokenized', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData)
        });

        if (!responseCreditCard.ok) {
          const errorData = await responseCreditCard.json();
          console.error('Detalhes da resposta:', {
            status: responseCreditCard.status,
            statusText: responseCreditCard.statusText,
            responseBody: errorData
          });

          // Verifica se o erro é de token expirado/inválido
          if (errorData.errors && errorData.errors[0]?.code === 'invalid_creditCard') {
            console.log('Token do cartão expirado, gerando novo token...');
            
            // Tenta gerar um novo token
            const responseNewToken = await fetch('/api/asaas/credit-card/tokenize', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(tokenizeData)
            });

            if (!responseNewToken.ok) {
              throw new Error('Erro ao gerar novo token do cartão');
            }

            const newTokenData = await responseNewToken.json();
            console.log('Novo token gerado com sucesso:', {
              creditCardToken: newTokenData.creditCardToken,
              creditCardNumber: newTokenData.creditCardNumber,
              creditCardBrand: newTokenData.creditCardBrand
            });

            // Atualiza o token no banco de dados
            try {
              console.log('Tentando atualizar token no banco de dados:', {
                usersAicrusAcademy: userData.id,
                idCustomerAsaas: userInfo.asaasId,
                creditCardToken: '****',
                creditCardNumber: '****' + newTokenData.creditCardNumber.slice(-4),
                creditCardBrand: newTokenData.creditCardBrand
              });

              const updateCardResponse = await fetch('/api/cards/update', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  usersAicrusAcademy: userData.id,
                  idCustomerAsaas: userInfo.asaasId,
                  creditCardToken: newTokenData.creditCardToken,
                  creditCardNumber: newTokenData.creditCardNumber,
                  creditCardBrand: newTokenData.creditCardBrand
                })
              });

              const updateResponse = await updateCardResponse.json();

              if (!updateCardResponse.ok) {
                console.error('Erro detalhado ao atualizar cartão:', {
                  status: updateCardResponse.status,
                  statusText: updateCardResponse.statusText,
                  response: updateResponse
                });
                throw new Error('Falha ao atualizar token do cartão no banco de dados');
              }

              console.log('Token do cartão atualizado com sucesso:', {
                cardId: updateResponse.id,
                updatedAt: updateResponse.updatedAt
              });
            } catch (updateError) {
              console.error('Erro ao atualizar token no banco:', updateError);
              throw new Error('Falha ao atualizar token do cartão');
            }

            // Tenta o pagamento novamente com o novo token
            const newPaymentData = {
              ...paymentData,
              creditCardToken: newTokenData.creditCardToken
            };

            const responseNewPayment = await fetch('/api/payments/tokenized', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(newPaymentData)
            });

            if (!responseNewPayment.ok) {
              const newErrorData = await responseNewPayment.json();
              let errorMessage = 'Erro ao processar pagamento';

              if (newErrorData.error) {
                errorMessage = newErrorData.error;
              } else if (newErrorData.errors && newErrorData.errors.length > 0) {
                errorMessage = newErrorData.errors[0].description;
              }

              setError(errorMessage);
              setLoading(false);
              return;
            }

            // Se chegou aqui, o pagamento foi bem sucedido com o novo token
            const data: CreditCardPaymentResponse = await responseNewPayment.json();
            // Continua o fluxo normal...
            try {
              await TransactionService.updateTransaction(transaction.id, {
                idPayAsaas: data.paymentId
              });
              
              console.log('ID do pagamento atualizado na transação:', data.paymentId);

              if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(data.status)) {
                try {
                  await TransactionService.finalizeTransaction(transaction.id);
                  console.log('Transação finalizada com sucesso');
                } catch (error) {
                  console.error('Erro ao finalizar transação:', error);
                }
              }

              setPaymentStatus({
                id: data.paymentId,
                status: data.status as 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH'
              });
              
              setLoading(false);
              return;
            } catch (updateError) {
              console.error('Erro ao atualizar ID do pagamento na transação:', updateError);
            }
          }

          let errorMessage = 'Erro ao processar pagamento';

          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.errors && errorData.errors.length > 0) {
            errorMessage = errorData.errors[0].description;
          }

          setError(errorMessage);
          setLoading(false);
          return;
        }

        const data: CreditCardPaymentResponse = await responseCreditCard.json();

        // Atualizar transação com ID do pagamento
        try {
          await TransactionService.updateTransaction(transaction.id, {
            idPayAsaas: data.paymentId
          });
          
          console.log('ID do pagamento atualizado na transação:', data.paymentId);

          // Se o pagamento foi confirmado, finaliza a transação
          if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(data.status)) {
            try {
              await TransactionService.finalizeTransaction(transaction.id);
              console.log('Transação finalizada com sucesso');
            } catch (error) {
              console.error('Erro ao finalizar transação:', error);
            }
          }

          // Atualizar o status do pagamento para mostrar no componente PaymentStatus
          setPaymentStatus({
            id: data.paymentId,
            status: data.status as 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH'
          });
          
          setLoading(false);
        } catch (updateError) {
          console.error('Erro ao atualizar ID do pagamento na transação:', updateError);
          // Não interromper o fluxo por erro na atualização
        }
      } catch (err) {
        console.error('Erro completo ao processar pagamento:', err);
        setError(
          err instanceof Error 
            ? err.message 
            : 'Erro ao processar pagamento. Por favor, tente novamente.'
        );
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro completo ao processar pagamento:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Erro ao processar pagamento. Por favor, tente novamente.'
      );
      setLoading(false);
    } finally {
      onProcessingEnd();
    }
  };

  // Substituir o modal por PaymentStatus quando o pagamento for processado com sucesso
  if (paymentStatus && ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(paymentStatus.status)) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-sm text-gray-500">
              <CreditCardIcon className="h-5 w-5 text-gray-400" />
              <span>Pagamento processado para:</span>
              <span className="font-medium text-gray-900">{userInfo?.email}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-6">
            <PaymentStatus 
              status={paymentStatus.status} 
              buttonText="Acessar meu produto"
              paymentMethod="credit-card"
              paymentDetails={{
                valor: valorCartao,
                parcelas: selectedInstallment,
                valorParcela: parcelas[selectedInstallment - 1]?.valorParcela,
                produto: produto?.id
              }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  if (!isInfoLocked) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <CreditCardIcon className="h-5 w-5 text-gray-400" />
            <span>Pagamento para:</span>
            <span className="font-medium text-gray-900">Preencha suas informações acima</span>
          </div>
        </div>

        <div className="opacity-50 pointer-events-none">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Pagamento com Cartão</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {valorCartao < 5 
                    ? 'Valor mínimo para pagamento com cartão é R$ 5,00'
                    : podeParcelar 
                      ? `Parcele em até ${parcelas.length}x`
                      : 'Valor disponível apenas para pagamento à vista'}
                </p>
              </div>

              <div className="bg-[#0F2B1B]/5 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <CreditCardIcon className="h-6 w-6 text-[#0F2B1B]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[#0F2B1B]">Informações do Cartão</h4>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      <li>✓ Pagamento seguro</li>
                      <li>✓ Aprovação imediata</li>
                      <li>✓ Acesso liberado na hora</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                disabled
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-[#0F2B1B] hover:bg-[#0F2B1B]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F2B1B] transition-colors opacity-50 cursor-not-allowed"
              >
                <CreditCardIcon className="h-5 w-5 mr-2" />
                PAGAR COM CARTÃO
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <CreditCardIcon className="h-5 w-5 text-gray-400" />
            <span>Pagamento para:</span>
            <span className="font-medium text-gray-900">{userInfo?.email}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Pagamento com Cartão</h3>
            <p className="mt-2 text-sm text-gray-600">
              {valorCartao < 5 
                ? 'Valor mínimo para pagamento com cartão é R$ 5,00'
                : podeParcelar 
                  ? `Parcele em até ${parcelas.length}x`
                  : 'Valor disponível apenas para pagamento à vista'}
            </p>
          </div>

          <div>
            <label htmlFor="installment" className="block text-sm font-medium text-gray-700 mb-3 px-1">
              Parcelamento
            </label>
            <div className="mt-1 relative">
              <select
                id="installment"
                name="installment"
                value={selectedInstallment}
                onChange={(e) => setSelectedInstallment(Number(e.target.value))}
                className="block w-full pl-3 pr-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] appearance-none"
              >
                {[...parcelas].reverse().map(parcela => (
                  <option key={parcela.numeroParcela} value={parcela.numeroParcela}>
                    {parcela.numeroParcela === 1 
                      ? `À vista - R$ ${formatarMoeda(parcela.valorParcela)}`
                      : `${parcela.numeroParcela}x de R$ ${formatarMoeda(parcela.valorParcela)}*`
                    }
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDownIcon className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="holderName" className="block text-sm font-medium text-gray-700 mb-3 px-1">
                Nome no cartão
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="holderName"
                  name="holderName"
                  value={formData.holderName}
                  onChange={handleInputChange}
                  placeholder="Como está no cartão"
                  className="block w-full pl-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-3 px-1">
                Número do cartão
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCardIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="number"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  placeholder="1234 5678 9012 3456"
                  className="block w-full pl-10 pr-12 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {cardBrand !== 'unknown' && (
                    <Image 
                      src={`/${cardBrand}.svg`} 
                      alt={cardBrand} 
                      width={32} 
                      height={20} 
                      className="opacity-100 transition-opacity duration-200"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8">
                <label className="block text-sm font-medium text-gray-700 mb-3 px-1">
                  Data de Validade
                </label>
                <div className="mt-1 relative">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CalendarIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        id="expiryMonth"
                        name="expiryMonth"
                        value={formData.expiryMonth}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-2 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                        required
                      >
                        <option value="">MM</option>
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = (i + 1).toString().padStart(2, '0');
                          return (
                            <option key={month} value={month}>
                              {month}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CalendarIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        id="expiryYear"
                        name="expiryYear"
                        value={formData.expiryYear}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-2 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                        required
                      >
                        <option value="">AA</option>
                        {Array.from({ length: 11 }, (_, i) => {
                          const year = (new Date().getFullYear() + i).toString();
                          return (
                            <option key={year} value={year}>
                              {year.slice(-2)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-3 px-1">
                  CVV
                  <button
                    type="button"
                    className="ml-1 text-gray-400 hover:text-gray-500"
                    onClick={() => alert('O CVV é o código de segurança de 3 ou 4 dígitos que está no verso do seu cartão.')}
                  >
                    <QuestionMarkCircleIcon className="h-4 w-4" />
                  </button>
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <QuestionMarkCircleIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="ccv"
                    name="ccv"
                    value={formData.ccv}
                    onChange={handleInputChange}
                    placeholder="123"
                    className="block w-full pl-10 pr-2 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                    required
                    maxLength={3}
                  />
                </div>
              </div>
            </div>

            {showAdditionalFields && (
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div>
                  <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-3 px-1">
                    CPF do titular
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IdentificationIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="cpf"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleInputChange}
                      placeholder="000.000.000-00"
                      className="block w-full pl-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-3 px-1">
                    Telefone do titular
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(00) 00000-0000"
                      className="block w-full pl-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-3 px-1">
                    CEP
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="00000-000"
                      className="block w-full pl-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="addressNumber" className="block text-sm font-medium text-gray-700 mb-3 px-1">
                    Número
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="addressNumber"
                      name="addressNumber"
                      value={formData.addressNumber}
                      onChange={handleInputChange}
                      placeholder="123"
                      className="block w-full pl-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="addressComplement" className="block text-sm font-medium text-gray-700 mb-3 px-1">
                    Complemento (opcional)
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="addressComplement"
                      name="addressComplement"
                      value={formData.addressComplement}
                      onChange={handleInputChange}
                      placeholder="Apto, Sala, etc."
                      className="block w-full pl-10 rounded-lg text-gray-900 bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 focus:border-[#0F2B1B] sm:text-sm h-11 outline-none focus:outline-none focus:ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-6">
            {/* Checkbox de consentimento LGPD removido */}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-medium text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-[#0F2B1B] to-[#1C4F33] hover:from-[#1C4F33] hover:to-[#0F2B1B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F2B1B]`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <CreditCardIcon className="h-5 w-5 mr-3" />
                PAGAR COM CARTÃO
              </>
            )}
          </button>

          <div className="flex items-center justify-center space-x-4">
            <Image src="/visa.svg" alt="Visa" width={32} height={20} />
            <Image src="/mastercard.svg" alt="Mastercard" width={32} height={20} />
            <Image src="/elo.svg" alt="Elo" width={32} height={20} />
          </div>

          <p className="text-xs text-gray-500 text-center">
            Seus dados estão seguros e criptografados
          </p>
        </form>
      </div>

      {error && (
        <div className="text-red-500 text-sm text-center">
          {error}
        </div>
      )}
    </motion.div>
  );
} 