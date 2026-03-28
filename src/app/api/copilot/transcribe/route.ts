import { NextRequest, NextResponse } from 'next/server';

// POST /api/copilot/transcribe - ASR endpoint (audio → text)
export async function POST(request: NextRequest) {
  try {
    const { audio_base64 } = await request.json();

    if (!audio_base64 || typeof audio_base64 !== 'string') {
      return NextResponse.json(
        { error: 'Áudio em base64 é obrigatório' },
        { status: 400 }
      );
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const response = await zai.audio.asr.create({
      file_base64: audio_base64,
    });

    const transcription = response.text || '';

    if (!transcription.trim()) {
      return NextResponse.json({
        transcription: '',
        warning: 'Não foi possível transcrever o áudio. Fale mais próximo do microfone.',
      });
    }

    return NextResponse.json({ transcription: transcription.trim() });
  } catch (error) {
    console.error('ASR error:', error);
    return NextResponse.json(
      { error: 'Erro na transcrição', transcription: '' },
      { status: 500 }
    );
  }
}
