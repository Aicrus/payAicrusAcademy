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

    console.log('Verificando se cliente já existe no Supabase:', {
      email: data.email,
      cpfCnpj: data.cpfCnpj
    });

    // Verificar se o cliente já existe no Supabase pelo email ou CPF/CNPJ
    const { data: existingCustomerByEmail } = await supabase
      .from('usersAicrusAcademy')
      .select('*')
      .eq('email', data.email)
      .single();

    const { data: existingCustomerByCpf } = await supabase
      .from('usersAicrusAcademy')
      .select('*')
      .eq('cpfCnpj', data.cpfCnpj)
      .single();

    const existingCustomer = existingCustomerByEmail || existingCustomerByCpf;

    // Se o cliente existe e tem um ID válido no Asaas, retornar esse cliente
    if (existingCustomer && existingCustomer.idCustomerAsaas) {
      console.log('Cliente encontrado no Supabase:', {
        id: existingCustomer.id,
        asaasId: existingCustomer.idCustomerAsaas
      });

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
    console.log('Criando novo cliente no Asaas');
    const customer = await createCustomer(data);
    console.log('Cliente criado no Asaas:', {
      id: customer.id,
      name: customer.name
    });

    // Se o cliente existe no Supabase mas não tem ID do Asaas, atualizar o registro
    if (existingCustomer) {
      console.log('Atualizando cliente existente no Supabase com novo ID do Asaas:', {
        supabaseId: existingCustomer.id,
        asaasId: customer.id
      });

      const { error: updateError } = await supabase
        .from('usersAicrusAcademy')
        .update({
          nome: data.name,
          email: data.email,
          cpfCnpj: data.cpfCnpj,
          whatsApp: data.mobilePhone,
          idCustomerAsaas: customer.id
        })
        .eq('id', existingCustomer.id);

      if (updateError) {
        console.error('Erro ao atualizar Supabase:', updateError);
        return NextResponse.json(
          { error: 'Erro ao atualizar dados do cliente' },
          { status: 500 }
        );
      }
    } else {
      // Criar novo registro no Supabase
      console.log('Criando novo registro no Supabase');
      const { error: insertError } = await supabase
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

      if (insertError) {
        console.error('Erro ao salvar no Supabase:', insertError);
        return NextResponse.json(
          { error: 'Erro ao salvar dados do cliente' },
          { status: 500 }
        );
      }
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