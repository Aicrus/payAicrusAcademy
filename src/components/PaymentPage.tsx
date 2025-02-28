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
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <PaymentProvider>
      <ProdutoProvider produto={produto}>
        <div className="min-h-screen flex flex-col lg:flex-row">
          {/* Left side - Fixed on desktop, scrollable on mobile */}
          <div className="hidden lg:flex w-full lg:w-1/2 bg-[#0F2B1B] p-8 lg:fixed lg:left-0 lg:top-0 lg:h-full flex-col">
            <div className="flex-1 flex flex-col max-w-lg mx-auto w-full mt-8">
              <div className="mb-8">
                <Image
                  src={produto.img}
                  alt={produto.nomeProduto}
                  width={180}
                  height={48}
                  className="h-auto w-auto"
                />
              </div>

              <div className="mt-8">
                <h2 className="text-white/80 text-sm mb-2">
                  Assinar {produto.nomeProduto}
                </h2>
                <div className="flex flex-col">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-white/60 line-through text-2xl">R$ {produto.preco.toFixed(2)}</span>
                    <span className="bg-green-500/20 text-green-400 text-sm px-2 py-0.5 rounded">{produto.porcentagemDesconto}</span>
                  </div>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-white text-4xl font-semibold">R$ {produto.precoDesconto.toFixed(2)}</span>
                    <span className="text-white/60">{produto.prazo}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-white/5 rounded-lg p-6 w-full">
                <div className="space-y-4">
                  <div className="flex justify-between text-white/80">
                    <span>Acesso {produto.prazo}</span>
                    <span>R$ {produto.precoDesconto.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-white/60">
                    <span>Pagamento anual</span>
                  </div>
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="flex justify-between text-white">
                      <span>Total devido hoje</span>
                      <span>R$ {produto.precoDesconto.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-6 w-full">
                <div className="flex items-center space-x-3 text-white/80">
                  <ShieldCheckIcon className="h-5 w-5 text-green-400" />
                  <span className="text-sm">Garantia de 7 dias</span>
                </div>
                <div className="text-sm text-white/60">
                  Experimente sem risco e descubra como essa oportunidade pode transformar sua vida de maneira positiva.
                </div>
                <div className="flex items-center space-x-3 text-white/80">
                  <ShieldCheckIcon className="h-5 w-5 text-green-400" />
                  <span className="text-sm">Suporte premium</span>
                </div>
                <div className="text-sm text-white/60">
                  Aproveite o suporte personalizado 1 a 1 para acelerar o aprendizado. Estamos aqui para ajudá-lo a alcançar seus objetivos com sucesso.
                </div>
              </div>

              <div className="mt-auto text-center">
                <div className="text-white/40 text-sm">
                  ©2025 Todos os direitos reservados · Aicrus Academy
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Scrollable */}
          <div className="w-full lg:w-1/2 min-h-screen lg:ml-[50%] bg-white">
            <div className="max-w-lg mx-auto py-8 px-4 lg:py-16 lg:px-8">
              {/* Mobile Product Info */}
              <div className="lg:hidden space-y-6 mb-8">
                <div className="flex justify-center mb-6">
                  <Image
                    src={produto.img}
                    alt={produto.nomeProduto}
                    width={160}
                    height={42}
                    className="h-auto w-auto"
                  />
                </div>

                <div>
                  <h2 className="text-gray-600 text-sm mb-2">
                    Assinar {produto.nomeProduto}
                  </h2>
                  <div className="flex flex-col">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-gray-500 line-through text-xl">R$ {produto.preco.toFixed(2)}</span>
                      <span className="bg-green-100 text-green-700 text-sm px-2 py-0.5 rounded">{produto.porcentagemDesconto}</span>
                    </div>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-gray-900 text-3xl font-semibold">R$ {produto.precoDesconto.toFixed(2)}</span>
                      <span className="text-gray-500">{produto.prazo}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Acesso {produto.prazo}</span>
                      <span>R$ {produto.precoDesconto.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <span>Pagamento anual</span>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between text-gray-900 font-medium">
                        <span>Total devido hoje</span>
                        <span>R$ {produto.precoDesconto.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-gray-600">
                    <ShieldCheckIcon className="h-5 w-5 text-[#0F2B1B]" />
                    <span className="text-sm">Garantia de 7 dias</span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-600">
                    <ShieldCheckIcon className="h-5 w-5 text-[#0F2B1B]" />
                    <span className="text-sm">Suporte premium</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* User Info Fields */}
                <UserInfoFields />

                {/* Payment Method Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Forma de Pagamento
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <motion.button
                      onClick={() => setSelectedMethod('credit-card')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex flex-col items-center justify-center p-6 rounded-xl transition-all ${
                        selectedMethod === 'credit-card'
                          ? 'bg-white shadow-lg border-2 border-[#0F2B1B] text-[#0F2B1B]'
                          : 'bg-gray-50 hover:bg-white hover:shadow-md text-gray-600 border border-gray-100'
                      }`}
                    >
                      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                        selectedMethod === 'credit-card' 
                          ? 'bg-[#0F2B1B]' 
                          : 'bg-gray-200'
                      }`} />
                      <CreditCardIcon className={`h-8 w-8 mb-3 ${
                        selectedMethod === 'credit-card'
                          ? 'text-[#0F2B1B]'
                          : 'text-gray-400'
                      }`} />
                      <span className="block text-sm font-medium text-center">
                        Cartão de Crédito
                      </span>
                      {selectedMethod === 'credit-card' && (
                        <motion.div
                          className="absolute inset-0 border-2 border-[#0F2B1B] rounded-xl"
                          layoutId="paymentMethodBorder"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.button>

                    <motion.button
                      onClick={() => setSelectedMethod('pix')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex flex-col items-center justify-center p-6 rounded-xl transition-all ${
                        selectedMethod === 'pix'
                          ? 'bg-white shadow-lg border-2 border-[#0F2B1B] text-[#0F2B1B]'
                          : 'bg-gray-50 hover:bg-white hover:shadow-md text-gray-600 border border-gray-100'
                      }`}
                    >
                      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                        selectedMethod === 'pix' 
                          ? 'bg-[#0F2B1B]' 
                          : 'bg-gray-200'
                      }`} />
                      <QrCodeIcon className={`h-8 w-8 mb-3 ${
                        selectedMethod === 'pix'
                          ? 'text-[#0F2B1B]'
                          : 'text-gray-400'
                      }`} />
                      <span className="block text-sm font-medium text-center">
                        PIX
                      </span>
                      {selectedMethod === 'pix' && (
                        <motion.div
                          className="absolute inset-0 border-2 border-[#0F2B1B] rounded-xl"
                          layoutId="paymentMethodBorder"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.button>

                    <motion.button
                      onClick={() => setSelectedMethod('boleto')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex flex-col items-center justify-center p-6 rounded-xl transition-all ${
                        selectedMethod === 'boleto'
                          ? 'bg-white shadow-lg border-2 border-[#0F2B1B] text-[#0F2B1B]'
                          : 'bg-gray-50 hover:bg-white hover:shadow-md text-gray-600 border border-gray-100'
                      }`}
                    >
                      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                        selectedMethod === 'boleto' 
                          ? 'bg-[#0F2B1B]' 
                          : 'bg-gray-200'
                      }`} />
                      <DocumentTextIcon className={`h-8 w-8 mb-3 ${
                        selectedMethod === 'boleto'
                          ? 'text-[#0F2B1B]'
                          : 'text-gray-400'
                      }`} />
                      <span className="block text-sm font-medium text-center">
                        Boleto
                      </span>
                      {selectedMethod === 'boleto' && (
                        <motion.div
                          className="absolute inset-0 border-2 border-[#0F2B1B] rounded-xl"
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