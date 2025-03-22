import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const transactionId = segments[segments.length - 1];

    if (!transactionId) {
      return NextResponse.json(
        { error: 'ID da transação inválido' },
        { status: 400 }
      );
    }

    // Primeiro, buscar os dados da transação
    const { data: transaction, error: fetchError } = await supabase
      .from('transacoes')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar transação:', fetchError);
      return NextResponse.json(
        { error: 'Erro ao buscar transação' },
        { status: 500 }
      );
    }

    // Atualizar status da transação para RECEIVED
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transacoes')
      .update({
        status: 'RECEIVED',
        dataHora: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar transação:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar transação' },
        { status: 500 }
      );
    }

    // Verificar se já existe uma compra ativa para este usuário e produto
    const { data: existingPurchase } = await supabase
      .from('comprasUser')
      .select('*')
      .eq('users', transaction.users)
      .eq('produto', transaction.produto)
      .eq('statusAcesso', 'ativo')
      .single();

    const dataInicio = new Date();
    // Definir data de fim como 1 ano após o início
    const dataFim = new Date(dataInicio);
    dataFim.setFullYear(dataFim.getFullYear() + 1);

    let compraId: number;

    if (existingPurchase) {
      // Atualizar a compra existente com a nova transação e nova data de fim
      const { error: updatePurchaseError } = await supabase
        .from('comprasUser')
        .update({
          transacao: transactionId,
          dataFim: dataFim.toISOString(),
          ultimaAtualizacao: new Date().toISOString()
        })
        .eq('id', existingPurchase.id);

      if (updatePurchaseError) {
        console.error('Erro ao atualizar compra:', updatePurchaseError);
        return NextResponse.json(
          { error: 'Erro ao atualizar compra' },
          { status: 500 }
        );
      }

      compraId = existingPurchase.id;
    } else {
      // Criar nova compra
      const { data: newPurchase, error: insertError } = await supabase
        .from('comprasUser')
        .insert({
          users: transaction.users,
          produto: transaction.produto,
          transacao: transactionId,
          dataInicio: dataInicio.toISOString(),
          dataFim: dataFim.toISOString(),
          statusAcesso: 'ativo',
          ultimaAtualizacao: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar compra:', insertError);
        return NextResponse.json(
          { error: 'Erro ao criar compra' },
          { status: 500 }
        );
      }

      compraId = newPurchase.id;
    }

    // Chamar a função do Firebase/Ticto para processar a compra
    console.log('Chamando API do Ticto para processar compra:', {
      transactionId,
      userId: transaction.users
    });

    const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const transactionHash = `TP${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
    const orderHash = `TO${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

    const firebaseResponse = await fetch('https://southamerica-east1-aicrus-academy.cloudfunctions.net/tictoPay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer nMu1cvFOsWjYmllSkc0Sh8gDF8VYqMD6TiWXToK1C9St7vWgv1JyVEG6CjpvH2XtKl968GB5qYLBRSUSdkufYs10gLQwwop0T6Y2`
      },
      body: JSON.stringify({
        status_date: "2025-03-18 09:00:23",
        checkout_url: "https://checkout.ticto.app/O8FBE843D",
        item: {
          amount: 64244,
          quantity: 1,
          members_classroom_id: null,
          refund_deadline: 7,
          offer_code: "O8FBE843D",
          product_name: "Maratona FlutterFlow 2.0 + 1.0",
          trial_days: null,
          offer_name: "Maratona FlutterFlow 2.0 + 1.0 - Acesso por 1 ano",
          offer_id: 115497,
          coupon_name: "MARATONA50",
          coupon_id: 100980,
          product_id: 81064,
          members_portal_id: null,
          days_of_access: null
        },
        telefone: 8107083737042,
        coproducers: [],
        phone_number_customer: 8107083737042,
        phone_local_code_customer: "",
        version: "2.0",
        tracking: {
          utm_term: "Não Informado",
          manychat_user_id: "Não Informado",
          utm_campaign: "Não Informado",
          src: "Não Informado",
          utm_medium: "Não Informado",
          sck: "Não Informado",
          event: "PageView",
          utm_source: "Não Informado",
          utm_content: "Não Informado"
        },
        marketplace_commission: 4491,
        token: "nMu1cvFOsWjYmllSkc0Sh8gDF8VYqMD6TiWXToK1C9St7vWgv1JyVEG6CjpvH2XtKl968GB5qYLBRSUSdkufYs10gLQwwop0T6Y2",
        shipping: {
          delivery_days: null,
          amount: 0,
          type: null,
          method: null
        },
        query_params: {
          currency: "BRL",
          code: "O8FBE843D",
          offer_code: "O8FBE843D",
          event: "PageView",
          payment_method: "credit_card",
          product_id: "81064"
        },
        producer: {
          amount: 59653,
          phone: "5547989214925",
          document: "36501721000122",
          name: "Paulo Morales Diaz Da costa",
          cms: "596.53",
          pid: "",
          id: 268729,
          email: "aicrus.oficial@gmail.com"
        },
        affiliates: [],
        commission_type: "producer",
        payment_method: "credit_card",
        transaction: {
          hash: "TPC14A701803IRL29EMR",
          cards: [
            {
              first_digits: "428067",
              holder: "Alexandre Juliano Feltz",
              brand: "visa",
              last_digits: "1383"
            }
          ]
        },
        status: "authorized",
        order: {
          paid_amount: 64244,
          order_date: "2025-03-18 09:00:19",
          id: 2351276,
          installments: 1,
          hash: "TOC3A8711803U0G64L4",
          transaction_hash: "TPC14A701803IRL29EMR"
        },
        customer: {
          country: {
            flag: {
              src: "countries_flags/jp.svg"
            },
            dial_code: "+81",
            languages: ["Japanese"],
            name: "Japan",
            currency: "JPY",
            region: "Asia",
            iso_code: "JP"
          },
          code: "U55F9C386",
          phone: {
            ddi: "+81",
            number: "07083737042",
            ddd: null
          },
          is_foreign: true,
          name: transaction.metaData?.name || 'alex',
          cpf: null,
          language: "en-US",
          cnpj: null,
          type: "person",
          email_confirmation: transaction.metaData?.email || 'alex20gustavo.2023@gmail.com',
          email: transaction.metaData?.email || 'alex20gustavo.2023@gmail.com'
        }
      })
    });

    if (!firebaseResponse.ok) {
      console.error('Erro ao processar compra no Ticto:', await firebaseResponse.text());
      // Não vamos lançar erro aqui para não interromper o fluxo
    } else {
      console.log('Compra processada com sucesso no Ticto');
    }

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('Erro ao finalizar transação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 