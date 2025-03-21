import { NextResponse } from 'next/server';
import { getPixQrCode } from '@/services/asaas/payment';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'ID do pagamento é obrigatório' },
        { status: 400 }
      );
    }

    // Obter QR code do PIX usando o serviço
    const pixQrCodeData = await getPixQrCode(paymentId);
    
    return NextResponse.json(pixQrCodeData);
  } catch (error) {
    console.error('Erro ao obter QR code PIX:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar requisição',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 