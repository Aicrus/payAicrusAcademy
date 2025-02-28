import { NextResponse } from 'next/server';
import { createCustomer, type CustomerData } from '@/services/asaas/customer';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const data: CustomerData = await request.json();

    // Validação detalhada dos dados
    if (!data.name?.trim()) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    if (!data.email?.trim()) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    if (!data.cpfCnpj?.trim()) {
      return NextResponse.json(
        { error: 'CPF/CNPJ é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o cliente já existe no Supabase
    const { data: existingCustomer } = await supabase
      .from('usersAicrusAcademy')
      .select('*')
      .eq('email', data.email)
      .single();

    if (existingCustomer) {
      return NextResponse.json({
        object: 'customer',
        id: existingCustomer.idCustomerAsaas,
        dateCreated: existingCustomer.created_at,
        name: existingCustomer.nome,
        email: existingCustomer.email,
        cpfCnpj: existingCustomer.cpfCnpj,
        mobilePhone: existingCustomer.whatsApp,
        personType: existingCustomer.cpfCnpj.length <= 11 ? 'FISICA' : 'JURIDICA'
      });
    }

    // Criar cliente no Asaas
    const customer = await createCustomer(data);

    // Criar registro no Supabase
    const { error: supabaseError } = await supabase
      .from('usersAicrusAcademy')
      .insert([
        {
          nome: data.name,
          email: data.email,
          cpfCnpj: data.cpfCnpj,
          whatsApp: data.mobilePhone,
          idCustomerAsaas: customer.id
        }
      ]);

    if (supabaseError) {
      console.error('Erro ao salvar no Supabase:', supabaseError);
      return NextResponse.json(
        { error: 'Erro ao salvar dados do cliente' },
        { status: 500 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Erro na rota de criação de cliente:', error);
    
    // Tentar extrair a mensagem de erro mais específica
    const errorMessage = error instanceof Error 
      ? error.message
      : 'Erro ao criar cliente';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 