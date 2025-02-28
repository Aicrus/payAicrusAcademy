'use client';

import { useState } from 'react';
import { usePayment } from '@/contexts/PaymentContext';
import { DocumentTextIcon, ClipboardDocumentIcon, CheckIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useProduto } from '@/contexts/ProdutoContext';
import { TransactionService } from '@/services/transaction';

interface BoletoPaymentResponse {
  paymentId: string;
  status: string;
  bankSlipUrl: string;
  value: number;
  dueDate: string;
  description: string;
  identificationField: string;
  barCode: string;
}

export default function BoletoForm() {
  const { userInfo, isInfoLocked } = usePayment();
  const { produto } = useProduto();
  const [loading, setLoading] = useState(false);
  const [boletoData, setBoletoData] = useState<BoletoPaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleGenerateBoleto = async () => {
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

    // Validar valor mínimo
    if (produto.precoDesconto < 5) {
      setError('O valor mínimo para pagamento via boleto é de R$ 5,00');
      return;
    }

    // Validar dados obrigatórios
    if (!userInfo.email || !userInfo.whatsapp) {
      setError('Email e WhatsApp são obrigatórios para o pagamento');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Iniciando geração de boleto com dados:', {
        email: userInfo.email,
        asaasId: userInfo.asaasId,
        valor: produto.precoDesconto
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
          
          // Atualizar transação existente para boleto
          try {
            await TransactionService.updateTransaction(pendingTransaction.id, {
              metodoPagamento: 'BOLETO',
              valor: produto.precoDesconto,
              produto: produto.id,
              metaData: {
                ...pendingTransaction.metaData,
                produto: {
                  preco: produto.precoDesconto
                }
              }
            });
            
            transaction = pendingTransaction;
            console.log('Transação atualizada para boleto');
          } catch (updateError) {
            console.error('Erro ao atualizar transação:', updateError);
            // Se falhar em atualizar, criar nova transação
            pendingTransaction = null;
          }
        }
      }

      // Se não encontrou transação pendente, cria uma nova
      if (!transaction) {
        const transactionData = {
          valor: produto.precoDesconto,
          status: 'PENDING' as const,
          metodoPagamento: 'BOLETO' as const,
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
      }

      console.log('Nova transação criada com sucesso:', {
        id: transaction.id,
        status: transaction.status,
        users: transaction.users
      });
        
      const responseBoleto = await fetch('/api/asaas/boleto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: userInfo.asaasId,
          description: `Assinatura Aicrus Academy - ${userInfo.email}`,
          value: Number(produto.precoDesconto.toFixed(2))
        })
      });

      if (!responseBoleto.ok) {
        const errorData = await responseBoleto.json();
        console.error('Erro na resposta da API Boleto:', errorData);
        throw new Error(errorData.error || 'Falha ao gerar boleto');
      }

      const data = await responseBoleto.json();

      // Atualizar transação com ID do pagamento
      try {
        await TransactionService.updateTransaction(transaction.id, {
          idPayAsaas: data.paymentId
        });
        
        console.log('ID do pagamento atualizado na transação:', data.paymentId);
      } catch (updateError) {
        console.error('Erro ao atualizar ID do pagamento na transação:', updateError);
        // Não interromper o fluxo por erro na atualização
      }

      setBoletoData(data);
    } catch (err) {
      console.error('Erro completo ao gerar boleto:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Erro ao gerar boleto. Por favor, tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const copyBoletoCode = async () => {
    if (boletoData?.identificationField) {
      try {
        await navigator.clipboard.writeText(boletoData.identificationField);
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

  const openBoletoInNewTab = () => {
    if (boletoData?.bankSlipUrl) {
      window.open(boletoData.bankSlipUrl, '_blank');
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
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            <span>Pagamento para:</span>
            <span className="font-medium text-gray-900">Preencha suas informações acima</span>
          </div>
        </div>

        <div className="opacity-50 pointer-events-none">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Pagamento via Boleto</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Pague através do boleto bancário. O acesso será liberado após a confirmação do pagamento (até 3 dias úteis).
                </p>
              </div>

              <div className="bg-[#0F2B1B]/5 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-6 w-6 text-[#0F2B1B]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[#0F2B1B]">Informações do Boleto</h4>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      <li>✓ Valor: R$ {(produto?.precoDesconto || 0).toFixed(2).replace('.', ',')}</li>
                      <li>✓ Vencimento em 3 dias úteis</li>
                      <li>✓ Pode ser pago em qualquer banco</li>
                      <li>✓ Acesso liberado após compensação</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                disabled
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-[#0F2B1B] hover:bg-[#0F2B1B]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F2B1B] transition-colors opacity-50 cursor-not-allowed"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                GERAR BOLETO
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!boletoData) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            <span>Pagamento para:</span>
            <span className="font-medium text-gray-900">{userInfo?.email}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Pagamento via Boleto</h3>
              <p className="mt-2 text-sm text-gray-600">
                Pague através do boleto bancário. O acesso será liberado após a confirmação do pagamento (até 3 dias úteis).
              </p>
            </div>

            <div className="bg-[#0F2B1B]/5 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-[#0F2B1B]" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#0F2B1B]">Informações do Boleto</h4>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>✓ Valor: R$ {(produto?.precoDesconto || 0).toFixed(2).replace('.', ',')}</li>
                    <li>✓ Vencimento em 3 dias úteis</li>
                    <li>✓ Pode ser pago em qualquer banco</li>
                    <li>✓ Acesso liberado após compensação</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateBoleto}
              disabled={loading}
              className="w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-medium text-white bg-gradient-to-r from-[#0F2B1B] to-[#1C4F33] hover:from-[#1C4F33] hover:to-[#0F2B1B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F2B1B] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <DocumentTextIcon className="h-5 w-5 mr-3" />
                  GERAR BOLETO
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
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            <span>Boleto gerado para:</span>
            <span className="font-medium text-gray-900">{userInfo?.email}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Boleto Bancário</h3>
            <p className="mt-2 text-sm text-gray-600">
              Seu boleto foi gerado com sucesso. Você pode copiar o código ou visualizar o boleto completo.
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-2">Copie o código do boleto:</p>
            <div className="relative flex items-center justify-center space-x-2">
              <code className="bg-gray-50 px-4 py-2 rounded text-sm font-mono text-gray-900 max-w-[300px] truncate">
                {boletoData.identificationField}
              </code>
              <button
                onClick={copyBoletoCode}
                className="p-2 text-gray-500 hover:text-[#0F2B1B] focus:outline-none"
                title="Copiar código do boleto"
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

          <button
            onClick={openBoletoInNewTab}
            className="w-full flex items-center justify-center py-3 px-4 border border-[#0F2B1B] rounded-lg shadow-sm text-base font-medium text-[#0F2B1B] hover:bg-[#0F2B1B]/5 transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="h-5 w-5 mr-2" />
            VISUALIZAR BOLETO
          </button>

          <div className="border-t border-gray-200 pt-6">
            <h4 className="font-medium text-gray-900 mb-4">Informações importantes:</h4>
            <ul className="text-sm text-gray-600 space-y-3">
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-xs font-medium mr-3">1</span>
                <span>O boleto vence em {new Date(boletoData.dueDate).toLocaleDateString()}</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-xs font-medium mr-3">2</span>
                <span>Pode ser pago em qualquer banco ou casa lotérica</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2B1B]/5 text-[#0F2B1B] text-xs font-medium mr-3">3</span>
                <span>O acesso será liberado em até 3 dias úteis após o pagamento</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-700">
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