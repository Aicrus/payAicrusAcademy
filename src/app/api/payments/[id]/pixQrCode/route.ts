import { NextRequest, NextResponse } from "next/server";
import { getPixQrCode } from "@/services/asaas/payment";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: any
) {
  console.log('=== Iniciando GET /api/payments/[id]/pixQrCode ===');
  console.log('Params recebidos:', context.params);
  
  try {
    const { id } = context.params;

    // Validar parâmetros
    if (!id) {
      console.error('ID do pagamento não fornecido');
      return NextResponse.json(
        { error: "ID do pagamento é obrigatório" },
        { status: 400 }
      );
    }

    const paymentId = id;
    console.log(`Processando solicitação de QR Code PIX para pagamento: ${paymentId}`);

    try {
      const qrCodeData = await getPixQrCode(paymentId);
      
      console.log('QR Code obtido com sucesso:', {
        paymentId,
        hasEncodedImage: !!qrCodeData.encodedImage,
        hasPayload: !!qrCodeData.payload,
        expirationDate: qrCodeData.expirationDate
      });
      
      return NextResponse.json(qrCodeData);
    } catch (serviceError: any) {
      console.error('Erro no serviço de QR Code PIX:', serviceError);
      
      // Verificar se é um erro de resposta da API
      if (serviceError.message && serviceError.message.includes('API Asaas')) {
        return NextResponse.json(
          { 
            error: "Erro ao obter QR Code PIX", 
            message: serviceError.message,
            errorType: "asaas_api_error"
          },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Erro ao processar solicitação de QR Code PIX", 
          message: serviceError.message || "Erro interno do servidor" 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erro não tratado na rota de QR Code PIX:', error);
    
    return NextResponse.json(
      { 
        error: "Erro interno do servidor", 
        message: error.message || "Ocorreu um erro inesperado", 
        errorType: "internal_server_error"
      },
      { status: 500 }
    );
  }
} 