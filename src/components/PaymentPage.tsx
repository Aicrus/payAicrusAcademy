'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { PaymentProvider } from '@/contexts/PaymentContext';
import UserInfoFields from '@/components/payment/UserInfoFields';
import CreditCardForm from '@/components/payment/CreditCardForm';
import PixForm from '@/components/payment/PixForm';
import BoletoForm from '@/components/payment/BoletoForm';
import { ShieldCheckIcon, CreditCardIcon, QrCodeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import type { Produto } from '@/types/produto';
import { ProdutoProvider } from '@/contexts/ProdutoContext';

type PaymentMethod = 'credit-card' | 'pix' | 'boleto';

// Componente que renderiza as informações do produto
function ProdutoInfo({ produto, isCompact = false }: { produto: Produto, isCompact?: boolean }) {
  return (
    <>
      <div className={isCompact ? "flex justify-center mb-3" : "mb-6"}>
        <Image
          src={produto.img}
          alt={produto.nomeProduto}
          width={isCompact ? 120 : 160}
          height={isCompact ? 32 : 42}
          className="h-auto w-auto"
        />
      </div>

      <div className={isCompact ? "" : "mt-6"}>
        <h2 className={`text-white/80 ${isCompact ? "text-[10px] sm:text-xs mb-1" : "text-xs mb-2"}`}>
          Assinar {produto.nomeProduto}
        </h2>
        <div className="flex flex-col">
          <div className="flex items-baseline space-x-2">
            <span className={`text-white/60 line-through ${isCompact ? "text-xs sm:text-sm" : "text-xl"}`}>
              R$ {produto.valorAntigo.toFixed(2)}
            </span>
            <span className={`bg-green-500/20 text-green-400 ${isCompact ? "text-[8px] sm:text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"} rounded`}>
              {produto.porcentagemDesconto}
            </span>
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className={`text-white font-semibold ${isCompact ? "text-base sm:text-xl" : "text-3xl"}`}>
              R$ {produto.valor.toFixed(2)}
            </span>
            <span className={`text-white/60 ${isCompact ? "text-[10px] sm:text-xs" : "text-sm"}`}>
              {produto.prazo}
            </span>
          </div>
        </div>
      </div>

      <div className={`${isCompact ? "bg-white/5 rounded-md p-2 sm:p-3 mt-2" : "mt-6 bg-white/5 rounded-lg p-5"} w-full`}>
        <div className={`${isCompact ? "space-y-1.5" : "space-y-3"}`}>
          <div className={`flex justify-between text-white/80 ${isCompact ? "text-[10px] sm:text-xs" : "text-sm"}`}>
            <span>Acesso {produto.prazo}</span>
            <span>R$ {produto.valor.toFixed(2)}</span>
          </div>
          <div className={`${isCompact ? "text-[8px] sm:text-[10px]" : "text-xs"} text-white/60`}>
            <span>Pagamento anual</span>
          </div>
          <div className={`border-t border-white/10 ${isCompact ? "pt-1.5 mt-1.5" : "pt-3 mt-3"}`}>
            <div className={`flex justify-between ${isCompact ? "text-[10px] sm:text-xs" : "text-sm"} text-white`}>
              <span>Valor total</span>
              <span>R$ {produto.valor.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {isCompact ? (
        <div className="grid grid-cols-2 gap-3 text-white/80 mt-3">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-3 w-3 text-green-400 flex-shrink-0" />
            <span className="text-[9px] sm:text-[10px]">Garantia de 7 dias</span>
          </div>
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-3 w-3 text-green-400 flex-shrink-0" />
            <span className="text-[9px] sm:text-[10px]">Suporte premium</span>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5 w-full">
          <div className="flex items-center space-x-3 text-white/80">
            <ShieldCheckIcon className="h-4 w-4 text-green-400" />
            <span className="text-xs">Garantia de 7 dias</span>
          </div>
          <div className="text-xs text-white/60">
            Experimente sem risco e descubra como essa oportunidade pode transformar sua vida de maneira positiva.
          </div>
          <div className="flex items-center space-x-3 text-white/80">
            <ShieldCheckIcon className="h-4 w-4 text-green-400" />
            <span className="text-xs">Suporte premium</span>
          </div>
          <div className="text-xs text-white/60">
            Aproveite o suporte personalizado 1 a 1 para acelerar o aprendizado. Estamos aqui para ajudá-lo a alcançar seus objetivos com sucesso.
          </div>
        </div>
      )}
    </>
  );
}

export default function PaymentPage() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('credit-card');
  const [produto, setProduto] = useState<Produto | null>(null);

  useEffect(() => {
    const fetchProduto = async () => {
      try {
        const { data, error } = await supabase
          .from('produtosAicrusAcademy')
          .select('*')
          .single();

        if (error) {
          console.error('Erro ao buscar produto:', error.message);
          return;
        }

        if (!data) {
          console.error('Nenhum produto encontrado');
          return;
        }

        setProduto(data);
      } catch (err) {
        console.error('Erro inesperado ao buscar produto:', err);
      }
    };

    fetchProduto();

    // Configurando o realtime subscription
    const channel = supabase
      .channel('produto-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtosAicrusAcademy',
          filter: `id=eq.${produto?.id}`
        },
        async (payload) => {
          console.log('Mudança detectada:', payload);
          try {
            // Busca os dados atualizados diretamente do banco
            const { data, error } = await supabase
              .from('produtosAicrusAcademy')
              .select('*')
              .single();
              
            if (error) {
              console.error('Erro ao atualizar produto:', error.message);
              return;
            }

            if (!data) {
              console.error('Nenhum produto encontrado na atualização');
              return;
            }

            console.log('Dados atualizados:', data);
            setProduto(data);
          } catch (err) {
            console.error('Erro inesperado ao atualizar produto:', err);
          }
        }
      )
      .subscribe((status) => {
        console.log('Status da subscription:', status);
      });

    // Limpeza da subscription quando o componente for desmontado
    return () => {
      channel.unsubscribe();
    };
  }, [produto?.id]); // Adiciona produto.id como dependência

  if (!produto) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">Carregando...</div>;
  }

  return (
    <PaymentProvider>
      <ProdutoProvider produto={produto}>
        <div className="min-h-screen flex flex-col lg:flex-row">
          {/* Left side - Visível apenas em desktop (lg) */}
          <div className="hidden lg:flex lg:w-1/2 h-screen lg:fixed lg:top-0 lg:left-0 bg-[#0F2B1B] justify-center overflow-y-auto">
            <div className="flex flex-col max-w-lg w-full py-12 px-8">
              <ProdutoInfo produto={produto} />

              <div className="mt-auto text-center pb-6">
                <div className="text-white/40 text-xs">
                  ©2025 Todos os direitos reservados · Aicrus Academy
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Full width em mobile e tablet, metade em desktop */}
          <div className="w-full lg:w-1/2 min-h-screen lg:ml-[50%] bg-white">
            <div className="max-w-lg mx-auto py-4 sm:py-6 lg:py-12 px-3 sm:px-4 lg:px-8">
              {/* Mobile & Tablet View Header com informações do produto */}
              <div className="lg:hidden space-y-4 mb-5 bg-[#0F2B1B] rounded-lg p-3 sm:p-4">
                <ProdutoInfo produto={produto} isCompact={true} />
              </div>

              <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                {/* User Info Fields */}
                <UserInfoFields />

                {/* Payment Method Selection */}
                <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
                  <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900">
                    Forma de Pagamento
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3">
                    <motion.button
                      onClick={() => setSelectedMethod('credit-card')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex flex-col items-center justify-center p-2 sm:p-3 lg:p-3 rounded-lg sm:rounded-xl transition-all ${
                        selectedMethod === 'credit-card'
                          ? 'bg-white shadow-lg border-2 border-[#0F2B1B] text-[#0F2B1B]'
                          : 'bg-gray-50 hover:bg-white hover:shadow-md text-gray-600 border border-gray-100'
                      }`}
                    >
                      <div className={`absolute top-0.5 sm:top-1 lg:top-1 right-0.5 sm:right-1 lg:right-1 w-1 sm:w-1.5 lg:w-1.5 h-1 sm:h-1.5 lg:h-1.5 rounded-full ${
                        selectedMethod === 'credit-card' 
                          ? 'bg-[#0F2B1B]' 
                          : 'bg-gray-200'
                      }`} />
                      <CreditCardIcon className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-5 lg:w-5 mb-1 sm:mb-1.5 lg:mb-1.5 ${
                        selectedMethod === 'credit-card'
                          ? 'text-[#0F2B1B]'
                          : 'text-gray-400'
                      }`} />
                      <span className="block text-[10px] sm:text-xs lg:text-xs font-medium text-center">
                        Cartão de Crédito
                      </span>
                      {selectedMethod === 'credit-card' && (
                        <motion.div
                          className="absolute inset-0 border-2 border-[#0F2B1B] rounded-lg sm:rounded-xl"
                          layoutId="paymentMethodBorder"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.button>

                    <motion.button
                      onClick={() => setSelectedMethod('pix')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex flex-col items-center justify-center p-2 sm:p-3 lg:p-3 rounded-lg sm:rounded-xl transition-all ${
                        selectedMethod === 'pix'
                          ? 'bg-white shadow-lg border-2 border-[#0F2B1B] text-[#0F2B1B]'
                          : 'bg-gray-50 hover:bg-white hover:shadow-md text-gray-600 border border-gray-100'
                      }`}
                    >
                      <div className={`absolute top-0.5 sm:top-1 lg:top-1 right-0.5 sm:right-1 lg:right-1 w-1 sm:w-1.5 lg:w-1.5 h-1 sm:h-1.5 lg:h-1.5 rounded-full ${
                        selectedMethod === 'pix' 
                          ? 'bg-[#0F2B1B]' 
                          : 'bg-gray-200'
                      }`} />
                      <QrCodeIcon className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-5 lg:w-5 mb-1 sm:mb-1.5 lg:mb-1.5 ${
                        selectedMethod === 'pix'
                          ? 'text-[#0F2B1B]'
                          : 'text-gray-400'
                      }`} />
                      <span className="block text-[10px] sm:text-xs lg:text-xs font-medium text-center">
                        PIX
                      </span>
                      {selectedMethod === 'pix' && (
                        <motion.div
                          className="absolute inset-0 border-2 border-[#0F2B1B] rounded-lg sm:rounded-xl"
                          layoutId="paymentMethodBorder"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.button>

                    <motion.button
                      onClick={() => setSelectedMethod('boleto')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex flex-col items-center justify-center p-2 sm:p-3 lg:p-3 rounded-lg sm:rounded-xl transition-all ${
                        selectedMethod === 'boleto'
                          ? 'bg-white shadow-lg border-2 border-[#0F2B1B] text-[#0F2B1B]'
                          : 'bg-gray-50 hover:bg-white hover:shadow-md text-gray-600 border border-gray-100'
                      }`}
                    >
                      <div className={`absolute top-0.5 sm:top-1 lg:top-1 right-0.5 sm:right-1 lg:right-1 w-1 sm:w-1.5 lg:w-1.5 h-1 sm:h-1.5 lg:h-1.5 rounded-full ${
                        selectedMethod === 'boleto' 
                          ? 'bg-[#0F2B1B]' 
                          : 'bg-gray-200'
                      }`} />
                      <DocumentTextIcon className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-5 lg:w-5 mb-1 sm:mb-1.5 lg:mb-1.5 ${
                        selectedMethod === 'boleto'
                          ? 'text-[#0F2B1B]'
                          : 'text-gray-400'
                      }`} />
                      <span className="block text-[10px] sm:text-xs lg:text-xs font-medium text-center">
                        Boleto
                      </span>
                      {selectedMethod === 'boleto' && (
                        <motion.div
                          className="absolute inset-0 border-2 border-[#0F2B1B] rounded-lg sm:rounded-xl"
                          layoutId="paymentMethodBorder"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Payment Forms */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedMethod}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {selectedMethod === 'credit-card' && <CreditCardForm />}
                    {selectedMethod === 'pix' && <PixForm />}
                    {selectedMethod === 'boleto' && <BoletoForm />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </ProdutoProvider>
    </PaymentProvider>
  );
} 