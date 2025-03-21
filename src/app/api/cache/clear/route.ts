import { NextResponse } from 'next/server';
import { UserInfoService } from '@/services/userInfo';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { userId, email } = data;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'ID do usuário e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Limpar o cache do usuário
    UserInfoService.clearCache();

    console.log('Cache limpo para usuário:', {
      userId,
      email
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    return NextResponse.json(
      { error: 'Erro ao limpar cache' },
      { status: 500 }
    );
  }
} 