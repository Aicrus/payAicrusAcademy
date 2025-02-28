'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePayment } from '@/contexts/PaymentContext';
import { QrCodeIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useProduto } from '@/contexts/ProdutoContext';
import PaymentStatus from './PaymentStatus';
import { TransactionService } from '@/services/transaction';
import type { TransactionData } from '@/services/transaction';

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

export default function PixForm() {
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
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);

  useEffect(() => {
    return () => {
      if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
      }
    };
  }, [autoCheckInterval]);

  useEffect(() => {
    if (pixData?.paymentId && currentTransaction?.id) {
      const checkInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/asaas/payments/${pixData.paymentId}/status`);
          const data = await response.json();
          
          if (data.status) {
            setPaymentStatus(prevStatus => ({
              ...prevStatus!,
              status: data.status,
              confirmedDate: data.confirmedDate,
              paymentDate: data.paymentDate
            }));

            if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(data.status)) {
              try {
                await TransactionService.finalizeTransaction(currentTransaction.id);
                console.log('Transação finalizada com sucesso');
              } catch (error) {
                console.error('Erro ao finalizar transação:', error);
              }
              clearInterval(checkInterval);
            }
          }
        } catch (error) {
          console.error('Erro ao verificar status do pagamento:', error);
        }
      }, 5000);

      return () => clearInterval(checkInterval);
    }
  }, [pixData?.paymentId, currentTransaction]);

  const checkPaymentStatus = async (paymentId: string) => {
    try {
      setIsVerifying(true);
      const response = await fetch(`/api/asaas/payments/${paymentId}/status`);
      const data = await response.json();
      
      if (data.status) {
        setPaymentStatus(prevStatus => ({
          ...prevStatus!,
          status: data.status,
          confirmedDate: data.confirmedDate,
          paymentDate: data.paymentDate
        }));
      }
      
      return data.status;
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
    
    setTimeout(async () => {
      const status = await checkPaymentStatus(paymentId);
      if (status === 'RECEIVED' || status === 'CONFIRMED' || status === 'RECEIVED_IN_CASH') {
        if (autoCheckInterval) {
          clearInterval(autoCheckInterval);
          setAutoCheckInterval(null);
        }
      }
    }, 45000);

    const interval = setInterval(async () => {
      const status = await checkPaymentStatus(paymentId);
      if (status === 'RECEIVED' || status === 'CONFIRMED' || status === 'RECEIVED_IN_CASH') {
        clearInterval(interval);
        setAutoCheckInterval(null);
      }
    }, 20000);

    setAutoCheckInterval(interval);
  };

  const handleManualCheck = () => {
    if (pixData?.paymentId) {
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

    if (produto.precoDesconto < 5) {
      setError('O valor mínimo para pagamento via PIX é de R$ 5,00');
      return;
    }

    if (!userInfo.email || !userInfo.whatsapp) {
      setError('Email e WhatsApp são obrigatórios para o pagamento');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Iniciando geração de PIX com dados:', {
        email: userInfo.email,
        asaasId: userInfo.asaasId,
        valor: produto.precoDesconto
      });

      const response = await fetch(`/api/asaas/customers/${userInfo.asaasId}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar informações do usuário');
      }
      const userData = await response.json();

      if (!userData || !userData.id) {
        console.error('Dados do usuário inválidos:', userData);
        throw new Error('Usuário não encontrado no sistema');
      }

      console.log('Usuário encontrado:', {
        id: userData.id,
        email: userData.email,
        idCustomerAsaas: userData.idCustomerAsaas
      });

      const response2 = await fetch(`/api/transactions/pending/${userData.id}`);
      let transaction = null;
      
      if (response2.ok) {
        let pendingTransaction = await response2.json();
        if (pendingTransaction && pendingTransaction.id) {
          console.log('Transação pendente encontrada:', pendingTransaction);
          
          try {
            await TransactionService.updateTransaction(pendingTransaction.id, {
              valor: produto.precoDesconto,
              produto: produto.id,
              paymentMethod: 'PIX',
              metaData: {
                ...pendingTransaction.metaData,
                produto: {
                  preco: produto.precoDesconto
                }
              }
            });
            
            transaction = pendingTransaction;
            console.log('Transação atualizada para PIX');
          } catch (updateError) {
            console.error('Erro ao atualizar valor da transação:', updateError);
            pendingTransaction = null;
          }
        }
      }

      if (!transaction) {
        const transactionData: TransactionData = {
          amount: produto.precoDesconto,
          status: 'PENDING',
          paymentMethod: 'PIX',
          userId: userData.id,
          productId: produto.id,
          idCustomerAsaas: userInfo.asaasId,
          users: Number(userData.id),
          produto: produto.id,
          metaData: {
            email: userInfo.email,
            whatsapp: userInfo.whatsapp,
            produto: {
              preco: produto.precoDesconto
            }
          }
        };

        console.log('Criando nova transação com dados:', transactionData);
        
        transaction = await TransactionService.createTransaction(transactionData);
        
        if (!transaction || !transaction.id) {
          throw new Error('Falha ao criar transação: ID não retornado');
        }

        console.log('Nova transação criada com sucesso:', {
          id: transaction.id,
          status: transaction.status,
          users: transaction.users
        });
      }
        
      setCurrentTransaction(transaction);

      const responsePix = await fetch('/api/asaas/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: userInfo.asaasId,
          description: `Assinatura Aicrus Academy - ${userInfo.email}`,
          value: Number(produto.precoDesconto.toFixed(2))
        }),
        cache: 'no-store'
      });

      if (!responsePix.ok) {
        const errorData = await responsePix.json();
        console.error('Erro na resposta da API PIX:', errorData);
        throw new Error(errorData.error || 'Falha ao gerar QR Code PIX');
      }

      const data = await responsePix.json();

      try {
        await TransactionService.updateTransaction(transaction.id, {
          idPayAsaas: data.paymentId
        });
        
        console.log('ID do pagamento atualizado na transação:', data.paymentId);
      } catch (updateError) {
        console.error('Erro ao atualizar ID do pagamento na transação:', updateError);
      }

      setPixData(data);
      setPaymentStatus({
        id: data.paymentId,
        status: 'PENDING',
        value: produto.precoDesconto,
        netValue: produto.precoDesconto,
        description: `Assinatura Aicrus Academy - ${userInfo.email}`,
        billingType: 'PIX',
        confirmedDate: null,
        paymentDate: null
      });
      startAutoCheck(data.paymentId);
    } catch (err) {
      console.error('Erro completo ao gerar PIX:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Erro ao gerar QR Code PIX. Por favor, tente novamente.'
      );
    } finally {
      setLoading(false);
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
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <QrCodeIcon className="h-5 w-5 text-gray-400" />
            <span>Pagamento para:</span>
            <span className="font-medium text-gray-900">{userInfo?.email}</span>
          </div>
        </div>

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
              onClick={handleGeneratePixQRCode}
              disabled={loading}
              className="w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-medium text-white bg-gradient-to-r from-[#0F2B1B] to-[#1C4F33] hover:from-[#1C4F33] hover:to-[#0F2B1B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F2B1B] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <QrCodeIcon className="h-5 w-5 mr-3" />
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
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <QrCodeIcon className="h-5 w-5 text-gray-400" />
            <span>QR Code gerado para:</span>
            <span className="font-medium text-gray-900">{userInfo?.email}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="bg-gray-100 p-4 rounded-lg">
              <Image
                src={`data:image/png;base64,${pixData.encodedImage}`}
                alt="QR Code PIX"
                width={200}
                height={200}
                className="w-48 h-48"
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-2">Copie o código PIX:</p>
            <div className="relative flex items-center justify-center space-x-2">
              <code className="bg-gray-50 px-4 py-2 rounded text-sm font-mono text-gray-900 max-w-[300px] truncate">{pixData.payload}</code>
              <button
                onClick={copyPixCode}
                className="p-2 text-gray-500 hover:text-[#0F2B1B] focus:outline-none"
                title="Copiar código PIX completo"
              >
                {isCopied ? (
                  <CheckIcon className="h-5 w-5 text-[#0F2B1B]" />
                ) : (
                  <ClipboardDocumentIcon className="h-5 w-5" />
                )}
              </button>
              {showToast && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute right-[-50px] bg-[#7CB342] text-white px-3 py-1.5 rounded-md shadow-sm text-xs font-medium z-50"
                >
                  Copiado
                </motion.div>
              )}
            </div>
          </div>

          {paymentStatus && (
            <PaymentStatus
              status={paymentStatus.status}
              onVerifyClick={!autoCheckInterval ? handleManualCheck : undefined}
              isVerifying={isVerifying}
            />
          )}

          <div className="border-t border-gray-200 pt-6">
            <h4 className="font-medium text-gray-900 mb-4">Como pagar:</h4>
            <ol className="text-sm text-gray-600 space-y-3">
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-xs font-medium mr-3">1</span>
                <span>Abra o app do seu banco</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-xs font-medium mr-3">2</span>
                <span>Escolha pagar via PIX com QR Code</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-xs font-medium mr-3">3</span>
                <span>Escaneie o código acima ou cole o código copiado</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-xs font-medium mr-3">4</span>
                <span>Confirme o valor de R$ {produto?.precoDesconto.toFixed(2)}</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-xs font-medium mr-3">5</span>
                <span>Confirme o pagamento</span>
              </li>
            </ol>
          </div>

          <div className="bg-[#0F2B1B]/5 rounded-lg p-4">
            <p className="text-sm text-[#0F2B1B]">
              Assim que recebermos a confirmação do pagamento, enviaremos um comprovante para seu WhatsApp ({userInfo?.whatsapp}) e email ({userInfo?.email}).
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm text-center">
          {error}
        </div>
      )}
    </motion.div>
  );
} 