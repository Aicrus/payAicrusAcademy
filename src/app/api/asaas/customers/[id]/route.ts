import { NextRequest, NextResponse } from 'next/server';
import { updateCustomer, deleteCustomer, createCustomer, getCustomer, type CustomerData } from '@/services/asaas/customer';
import { supabase } from '@/lib/supabase';
import { safeLog } from '@/utils/logger';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data: CustomerData = await request.json();

    // Verificar se o cliente existe e obter seus dados atuais
    const existingCustomer = await getCustomer(id);
    
    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Cliente não encontrado. Não é possível fazer alterações.' },
        { status: 404 }
      );
    }
    
    if (existingCustomer.deleted) {
      return NextResponse.json(
        { error: `O cliente [${id}] não pode ser atualizado: Cliente excluído, não é possível fazer alterações.` },
        { status: 400 }
      );
    }

    // Verificar se o email foi alterado
    if (existingCustomer.email !== data.email) {
      console.log('Email alterado. Criando novo cliente em vez de atualizar:', {
        oldEmail: existingCustomer.email,
        newEmail: data.email
      });

      // Criar novo cliente
      const newCustomer = await createCustomer(data);

      // Atualizar registro no Supabase
      const { error: supabaseError } = await supabase
        .from('usersAicrusAcademy')
        .update({
          nome: data.name,
          email: data.email,
          cpfCnpj: data.cpfCnpj,
          whatsApp: data.mobilePhone,
          idCustomerAsaas: newCustomer.id // Atualizar para o novo ID
        })
        .eq('idCustomerAsaas', id);

      if (supabaseError) {
        console.error('Erro ao atualizar Supabase:', supabaseError);
        return NextResponse.json(
          { error: 'Erro ao atualizar registro' },
          { status: 500 }
        );
      }

      return NextResponse.json(newCustomer);
    }

    // Se o email não foi alterado, atualizar cliente normalmente
    const customer = await updateCustomer(id, data);

    // Atualizar registro no Supabase
    const { error: supabaseError } = await supabase
      .from('usersAicrusAcademy')
      .update({
        nome: data.name,
        email: data.email,
        cpfCnpj: data.cpfCnpj,
        whatsApp: data.mobilePhone
      })
      .eq('idCustomerAsaas', id);

    if (supabaseError) {
      console.error('Erro ao atualizar Supabase:', supabaseError);
      return NextResponse.json(
        { error: 'Erro ao atualizar registro' },
        { status: 500 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Erro ao atualizar cliente'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Excluir cliente no Asaas
    await deleteCustomer(id);

    // Atualizar registro no Supabase
    const { error: supabaseError } = await supabase
      .from('usersAicrusAcademy')
      .update({ idCustomerAsaas: null })
      .eq('idCustomerAsaas', id);

    if (supabaseError) {
      console.error('Erro ao atualizar Supabase:', supabaseError);
      return NextResponse.json(
        { error: 'Erro ao atualizar registro' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Erro ao excluir cliente'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const asaasId = id;

    if (!asaasId) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório' },
        { status: 400 }
      );
    }

    safeLog('Buscando usuário com asaasId', { asaasId });

    // Buscar usuário no Supabase
    const { data: user, error } = await supabase
      .from('usersAicrusAcademy')
      .select('id, email, nome, cpfCnpj, whatsApp, idCustomerAsaas')
      .eq('idCustomerAsaas', asaasId)
      .single();

    if (error) {
      console.error('Erro ao buscar usuário:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      return NextResponse.json(
        { error: 'Erro ao buscar usuário' },
        { status: 500 }
      );
    }

    if (!user) {
      console.error('Usuário não encontrado para asaasId:', asaasId);
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    safeLog('Usuário encontrado', {
      id: user.id,
      email: user.email,
      idCustomerAsaas: user.idCustomerAsaas
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 