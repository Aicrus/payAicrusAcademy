'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePayment } from '@/contexts/PaymentContext';
import { QrCodeIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useProduto } from '@/contexts/ProdutoContext';
import PaymentStatus from './PaymentStatus';
import { TransactionService } from '@/services/transaction';
import type { TransactionData, Transaction } from '@/services/transaction';
import { safeLog } from '@/utils/logger';
import { formatarMoeda } from '@/utils/formatters';

interface PixPaymentResponse {
  paymentId: string;
  status: string;
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

interface PaymentStatus {
  id: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH';
  value: number;
  netValue: number;
  description: string;
  billingType: string;
  confirmedDate: string | null;
  paymentDate: string | null;
}

interface PixFormProps {
  discountApplied: boolean;
  onProcessingStart: () => void;
  onProcessingEnd: () => void;
}

export default function PixForm({ discountApplied, onProcessingStart, onProcessingEnd }: PixFormProps) {
  const { userInfo, isInfoLocked } = usePayment();
  const { produto } = useProduto();
  const [isCopied, setIsCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixPaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [autoCheckInterval, setAutoCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoCheckActive, setAutoCheckActive] = useState(false);
  const [autoCheckEnded, setAutoCheckEnded] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);

  // Valor que será usado para o PIX (com ou sem desconto)
  const valorPix = discountApplied && produto ? produto.valorDesconto : (produto?.valor || 0);

  useEffect(() => {
    return () => {
      if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
      }
    };
  }, [autoCheckInterval]);

  useEffect(() => {
    if (currentTransaction?.id && currentTransaction?.idPayAsaas) {
      console.log('Verificando status inicial da transação:', currentTransaction.id);
      checkPaymentStatus(currentTransaction.idPayAsaas);
    }
  }, [currentTransaction]);

  useEffect(() => {
    if (paymentStatus) {
      console.log('Status do pagamento atualizado:', paymentStatus.status);
      
      if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(paymentStatus.status)) {
        console.log('Pagamento confirmado, finalizando verificação');
        if (autoCheckInterval) {
          clearInterval(autoCheckInterval);
          setAutoCheckInterval(null);
        }
      }
    }
  }, [paymentStatus, autoCheckInterval]);

  const checkPaymentStatus = async (paymentId: string) => {
    try {
      setIsVerifying(true);
      
      // Verificar diretamente na API de pagamentos
      try {
        console.log('Verificando status do pagamento:', paymentId);
        const response = await fetch(`/api/asaas/payments/${paymentId}/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          console.error(`Erro na resposta HTTP: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error('Corpo da resposta de erro:', errorText?.substring(0, 200) || 'Vazio');
          throw new Error(`Erro ao verificar status: ${response.status} ${response.statusText}`);
        }
        
        // Obter o texto da resposta e tentar parsear como JSON
        const responseText = await response.text();
        console.log('Resposta bruta da API:', responseText);
        
        let statusData;
        try {
          statusData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Erro ao parsear resposta JSON:', parseError);
          console.error('Corpo da resposta:', responseText?.substring(0, 200) || 'Vazio');
          throw new Error('Resposta inválida do servidor');
        }
        
        console.log('Status do pagamento detalhado:', statusData);
        
        if (statusData && statusData.status) {
          // Atualizar o status do pagamento
          setPaymentStatus(prevStatus => ({
            ...prevStatus!,
            status: statusData.status,
            confirmedDate: statusData.confirmedDate || null,
            paymentDate: statusData.paymentDate || null
          }));
          
          // Atualizar a transação com o status recebido
          if (currentTransaction?.id) {
            try {
              console.log('Atualizando status da transação para:', statusData.status);
              await TransactionService.updateTransaction(String(currentTransaction.id), {
                status: statusData.status
              });
              console.log('Status da transação atualizado com sucesso');
              
              // Se o pagamento foi confirmado, finalizar a transação
              if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(statusData.status)) {
                console.log('Pagamento confirmado, finalizando transação...');
                try {
                  // Converter o ID para número antes de passar para a função
                  const transactionId = Number(currentTransaction.id);
                  await TransactionService.finalizeTransaction(transactionId);
                  console.log('Transação finalizada com sucesso');
                  
                  // Redirecionar para a página de sucesso ou mostrar mensagem
                  window.location.href = '/success';
                } catch (error) {
                  console.error('Erro ao finalizar transação:', error);
                }
              }
            } catch (updateError) {
              console.error('Erro ao atualizar status da transação:', updateError);
            }
          }
          
          return statusData.status;
        }
      } catch (apiError) {
        console.error('Erro ao verificar status via API:', apiError);
        
        // Caso a API falhe, tenta verificar na tabela de transações como fallback
        if (currentTransaction?.id) {
          console.log('Tentando verificar status na tabela de transações:', currentTransaction.id);
          
          try {
            const response = await fetch(`/api/transactions/${currentTransaction.id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Erro ao buscar transação: ${response.status} ${response.statusText}`);
            }
            
            const transactionData = await response.json();
            console.log('Dados da transação:', transactionData);
            
            if (transactionData && transactionData.status) {
              // Atualizar o status do pagamento
              setPaymentStatus(prevStatus => ({
                ...prevStatus!,
                status: transactionData.status,
                confirmedDate: transactionData.dataHora || null,
                paymentDate: transactionData.dataHora || null
              }));
              
              return transactionData.status;
            }
          } catch (fallbackError) {
            console.error('Erro ao buscar transação (fallback):', fallbackError);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
      return null;
    } finally {
      setIsVerifying(false);
    }
  };

  const startAutoCheck = (paymentId: string) => {
    if (autoCheckInterval) {
      clearInterval(autoCheckInterval);
    }
    
    console.log('Iniciando verificação automática para o pagamento:', paymentId);
    setAutoCheckActive(true);
    setAutoCheckEnded(false);
    
    // Verificar imediatamente uma vez
    checkPaymentStatus(paymentId);
    
    // Configurar para verificar a cada 12 segundos por 2.5 minutos (150 segundos)
    const checkCount = { current: 0 };
    const maxChecks = 13; // 2.5 minutos = 13 verificações a cada 12 segundos (156 segundos)
    const checkInterval = 12000; // 12 segundos
    
    const interval = setInterval(async () => {
      checkCount.current += 1;
      console.log(`Verificação ${checkCount.current}/${maxChecks} do pagamento ${paymentId}`);
      
      const status = await checkPaymentStatus(paymentId);
      console.log('Status retornado:', status);
      
      if (status === 'RECEIVED' || status === 'CONFIRMED' || status === 'RECEIVED_IN_CASH') {
        console.log('Pagamento confirmado, parando verificação automática');
        clearInterval(interval);
        setAutoCheckInterval(null);
        setAutoCheckActive(false);
        setAutoCheckEnded(true);
      } else if (checkCount.current >= maxChecks) {
        // Parar após 13 verificações (2.5 minutos)
        console.log('Máximo de verificações atingido, parando verificação automática');
        clearInterval(interval);
        setAutoCheckInterval(null);
        setAutoCheckActive(false);
        setAutoCheckEnded(true);
      }
    }, checkInterval);

    setAutoCheckInterval(interval);
  };

  const handleManualCheck = () => {
    if (pixData?.paymentId) {
      console.log('Verificação manual iniciada para o pagamento:', pixData.paymentId);
      checkPaymentStatus(pixData.paymentId);
    }
  };

  const handleGeneratePixQRCode = async () => {
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

    // Validar dados obrigatórios
    if (!userInfo.email || !userInfo.whatsapp) {
      setError('Email e WhatsApp são obrigatórios para o pagamento');
      return;
    }

    setLoading(true);
    setError(null);
    onProcessingStart();

    try {
      console.log('Iniciando geração de PIX com dados:', {
        email: userInfo.email,
        asaasId: userInfo.asaasId,
        valor: valorPix
      });

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

      console.log('Usuário encontrado:', {
        id: userData.id,
        email: userData.email,
        idCustomerAsaas: userData.idCustomerAsaas
      });

      // Buscar transação pendente existente
      const response2 = await fetch(`/api/transactions/pending/${userData.id}`);
      let transaction = null;
      
      if (response2.ok) {
        let pendingTransaction = await response2.json();
        if (pendingTransaction && pendingTransaction.id) {
          console.log('Transação pendente encontrada:', pendingTransaction);
          
          // Verificar se o valor da transação está atualizado com o valor atual do produto
          const valorAtualizado = pendingTransaction.valor === valorPix;
          
          if (!valorAtualizado) {
            console.log('Valor do produto foi alterado, atualizando transação:', {
              valorAntigo: pendingTransaction.valor,
              valorNovo: valorPix
            });
          }
          
          // Atualizar transação existente para PIX
          try {
            await TransactionService.updateTransaction(pendingTransaction.id, {
              valor: valorPix,
              produto: produto.id,
              metodoPagamento: 'PIX',
              idCustomerAsaas: userInfo.asaasId,
              metaData: {
                ...pendingTransaction.metaData,
                produto: {
                  valor: valorPix
                },
                valorAtualizado: true
              }
            });
            
            transaction = pendingTransaction;
            console.log('Transação atualizada para PIX:', {
              id: transaction.id,
              valorAtualizado: valorPix,
              idCustomerAsaas: userInfo.asaasId
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
          valor: valorPix,
          status: 'PENDING',
          metodoPagamento: 'PIX',
          users: userData.id,
          produto: produto.id,
          idCustomerAsaas: userData.idCustomerAsaas || userInfo.asaasId,
          dataHora: new Date().toISOString(),
          metaData: {
            cpf: userInfo.cpf,
            name: userInfo.name,
            email: userInfo.email,
            asaasId: userInfo.asaasId,
            produto: {
              valor: valorPix
            },
            dialCode: userInfo.dialCode,
            whatsapp: userInfo.whatsapp
          }
        };

        console.log('Criando transação com dados:', transactionData);
        
        transaction = await TransactionService.createTransaction(transactionData);
        
        if (!transaction || !transaction.id) {
          throw new Error('Falha ao criar transação: ID não retornado');
        }

        console.log('Transação criada com sucesso:', {
          id: transaction.id,
          status: transaction.status,
          users: transaction.users
        });
      }
        
      // Depois gerar o PIX
      console.log('Enviando requisição para gerar PIX...');
      const responsePix = await fetch('/api/asaas/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: userInfo.asaasId,
          description: `Assinatura Aicrus Academy - ${userInfo.email}`,
          value: Number(valorPix.toFixed(2))
        }),
        cache: 'no-store'
      });

      if (!responsePix.ok) {
        const errorText = await responsePix.text();
        console.error('Erro na resposta da API PIX:', errorText);
        throw new Error('Falha ao gerar PIX');
      }

      const pixResponse = await responsePix.json();
      console.log('Dados do PIX recebidos:', pixResponse);

      // Atualizar transação com ID do pagamento
      try {
        await TransactionService.updateTransaction(transaction.id, {
          idPayAsaas: pixResponse.id,
          idCustomerAsaas: userInfo.asaasId
        });
        console.log('ID do pagamento atualizado na transação:', pixResponse.id);
      } catch (updateError) {
        console.error('Erro ao atualizar ID do pagamento na transação:', updateError);
        // Não interromper o fluxo por erro na atualização
      }

      // Configurar dados do PIX para exibição
      setPixData({
        paymentId: pixResponse.id,
        status: pixResponse.status,
        encodedImage: pixResponse.encodedImage,
        payload: pixResponse.payload,
        expirationDate: pixResponse.expirationDate
      });

      // Iniciar verificação automática
      if (pixResponse.id) {
        console.log('Iniciando verificação automática do pagamento:', pixResponse.id);
        startAutoCheck(pixResponse.id);
      }

      setCurrentTransaction(transaction);
    } catch (err) {
      console.error('Erro completo ao gerar PIX:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Erro ao gerar PIX. Por favor, tente novamente.'
      );
    } finally {
      setLoading(false);
      onProcessingEnd();
    }
  };

  const copyPixCode = async () => {
    if (pixData?.payload) {
      try {
        await navigator.clipboard.writeText(pixData.payload);
        setIsCopied(true);
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setIsCopied(false);
        }, 2000);
      } catch (err) {
        console.error('Erro ao copiar:', err);
      }
    }
  };

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
            <QrCodeIcon className="h-5 w-5 text-gray-400" />
            <span>Pagamento para:</span>
            <span className="font-medium text-gray-900">Preencha suas informações acima</span>
          </div>
        </div>

        <div className="opacity-50 pointer-events-none">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Pagamento via PIX</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Pague instantaneamente usando o QR Code PIX. O acesso será liberado imediatamente após a confirmação do pagamento.
                </p>
              </div>

              <div className="bg-[#0F2B1B]/5 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <QrCodeIcon className="h-6 w-6 text-[#0F2B1B]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[#0F2B1B]">Benefícios do PIX</h4>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      <li>✓ Pagamento instantâneo</li>
                      <li>✓ Liberação imediata do acesso</li>
                      <li>✓ Segurança garantida pelo Banco Central</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                disabled
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-[#0F2B1B] hover:bg-[#0F2B1B]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F2B1B] transition-colors opacity-50 cursor-not-allowed"
              >
                <QrCodeIcon className="h-5 w-5 mr-2" />
                GERAR QR CODE PIX
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!pixData) {
    return (
      <motion.div
        className="space-y-4 sm:space-y-5 lg:space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gray-50 rounded-md lg:rounded-lg p-3 lg:p-4">
          <div className="flex items-center space-x-2 lg:space-x-3 text-[10px] sm:text-xs lg:text-sm text-gray-500">
            <QrCodeIcon className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
            <span>Pagamento para:</span>
            <span className="font-medium text-gray-900">{userInfo?.email}</span>
          </div>
        </div>

        <div className="bg-white rounded-md lg:rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-6">
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900">Pagamento via PIX</h3>
              <p className="mt-1.5 lg:mt-2 text-[10px] sm:text-xs lg:text-sm text-gray-600">
                Pague instantaneamente usando o QR Code PIX. O acesso será liberado imediatamente após a confirmação do pagamento.
              </p>
            </div>

            <div className="bg-[#0F2B1B]/5 rounded-md lg:rounded-lg p-2.5 sm:p-3 lg:p-4">
              <div className="flex items-start space-x-2 lg:space-x-3">
                <div className="flex-shrink-0">
                  <QrCodeIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-[#0F2B1B]" />
                </div>
                <div>
                  <h4 className="text-[10px] sm:text-xs lg:text-sm font-medium text-[#0F2B1B]">Benefícios do PIX</h4>
                  <ul className="mt-1 lg:mt-2 text-[9px] sm:text-[10px] lg:text-sm text-gray-600 space-y-0.5 lg:space-y-1">
                    <li>✓ Pagamento instantâneo</li>
                    <li>✓ Liberação imediata do acesso</li>
                    <li>✓ Segurança garantida pelo Banco Central</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleGeneratePixQRCode}
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 sm:py-3 lg:py-4 px-4 sm:px-5 lg:px-6 border border-transparent rounded-lg lg:rounded-xl shadow-md lg:shadow-lg text-sm sm:text-base lg:text-base font-medium text-white bg-gradient-to-r from-[#0F2B1B] to-[#1C4F33] hover:from-[#1C4F33] hover:to-[#0F2B1B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F2B1B] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white" />
              ) : (
                <>
                  <QrCodeIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 lg:mr-3" />
                  GERAR QR CODE PIX
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-5 lg:space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gray-50 rounded-md lg:rounded-lg p-3 lg:p-4">
        <div className="flex items-center space-x-2 lg:space-x-3 text-[10px] sm:text-xs lg:text-sm text-gray-500">
          <QrCodeIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-gray-400" />
          <span>QR Code gerado para:</span>
          <span className="font-medium text-gray-900">{userInfo?.email}</span>
        </div>
      </div>

      <div className="bg-white rounded-md lg:rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-6">
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          <div className="flex justify-center">
            <div className="bg-gray-100 p-2 sm:p-3 lg:p-4 rounded-md lg:rounded-lg">
              <Image
                src={`data:image/png;base64,${pixData.encodedImage}`}
                alt="QR Code PIX"
                width={200}
                height={200}
                className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48"
              />
            </div>
          </div>

          <div>
            <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 mb-1 sm:mb-1.5 lg:mb-2">Copie o código PIX:</p>
            <div className="relative flex items-center justify-center space-x-1.5 sm:space-x-2">
              <code className="bg-gray-50 px-2 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 rounded text-[9px] sm:text-xs lg:text-sm font-mono text-gray-900 max-w-[300px] truncate">{pixData.payload}</code>
              <button
                onClick={copyPixCode}
                className="p-1 sm:p-1.5 lg:p-2 text-gray-500 hover:text-[#0F2B1B] focus:outline-none"
                title="Copiar código PIX completo"
              >
                {isCopied ? (
                  <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-[#0F2B1B]" />
                ) : (
                  <ClipboardDocumentIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                )}
              </button>
              {showToast && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute right-[-40px] sm:right-[-45px] lg:right-[-50px] bg-[#7CB342] text-white px-1.5 py-0.5 sm:px-2 sm:py-1 lg:px-3 lg:py-1.5 rounded-md shadow-sm text-[8px] sm:text-[10px] lg:text-xs font-medium z-50"
                >
                  Copiado
                </motion.div>
              )}
            </div>
          </div>

          {paymentStatus && (
            <PaymentStatus 
              status={paymentStatus.status} 
              buttonText="Acessar meu produto"
              onVerifyClick={handleManualCheck}
              isVerifying={isVerifying}
              autoCheckActive={autoCheckActive}
              paymentMethod="pix"
              paymentDetails={{
                valor: valorPix,
                produto: produto?.id
              }}
            />
          )}

          <div className="border-t border-gray-200 pt-3 sm:pt-4 lg:pt-6">
            <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 lg:mb-4 text-xs sm:text-sm lg:text-base">Como pagar:</h4>
            <ol className="text-[9px] sm:text-xs lg:text-sm text-gray-600 space-y-1.5 sm:space-y-2 lg:space-y-3">
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-[8px] sm:text-[9px] lg:text-xs font-medium mr-1.5 sm:mr-2 lg:mr-3">1</span>
                <span>Abra o app do seu banco</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-[8px] sm:text-[9px] lg:text-xs font-medium mr-1.5 sm:mr-2 lg:mr-3">2</span>
                <span>Escolha pagar via PIX com QR Code</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-[8px] sm:text-[9px] lg:text-xs font-medium mr-1.5 sm:mr-2 lg:mr-3">3</span>
                <span>Escaneie o código acima ou cole o código copiado</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-[8px] sm:text-[9px] lg:text-xs font-medium mr-1.5 sm:mr-2 lg:mr-3">4</span>
                <span>Confirme o valor de R$ {formatarMoeda(valorPix)}</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-[8px] sm:text-[9px] lg:text-xs font-medium mr-1.5 sm:mr-2 lg:mr-3">5</span>
                <span>Confirme o pagamento</span>
              </li>
            </ol>
          </div>

          <div className="bg-[#0F2B1B]/5 rounded-md lg:rounded-lg p-2 sm:p-3 lg:p-4">
            <p className="text-[9px] sm:text-xs lg:text-sm text-[#0F2B1B]">
              Assim que recebermos a confirmação do pagamento, enviaremos um comprovante para seu email ({userInfo?.email}).
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-2 sm:p-2.5 lg:p-3">
          <div className="flex">
            <div className="ml-2">
              <p className="text-[9px] sm:text-xs lg:text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
} 