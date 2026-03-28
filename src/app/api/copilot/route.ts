import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/copilot - Main AI Co-Pilot endpoint
export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    // ── Step 1: Fetch all relevant data from DB ───────────
    const [
      allDrivers,
      activeTrips,
      recentTrips,
      activeLocations,
      settings,
    ] = await Promise.all([
      db.user.findMany({
        select: { id: true, name: true, email: true, role: true, phone: true, licensePlate: true },
      }),
      db.trip.findMany({
        where: { status: 'EM_ANDAMENTO' },
        include: { driver: { select: { id: true, name: true, licensePlate: true, phone: true } } },
        orderBy: { startedAt: 'desc' },
      }),
      db.trip.findMany({
        where: { status: 'FINALIZADA' },
        include: { driver: { select: { id: true, name: true, licensePlate: true } } },
        orderBy: { startedAt: 'desc' },
        take: 20,
      }),
      db.location.findMany({
        where: { updatedAt: { gte: new Date(Date.now() - 3 * 60 * 1000) } },
        include: { driver: { select: { id: true, name: true, licensePlate: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      db.settings.findFirst(),
    ]);

    const totalTrips = await db.trip.count();
    const finalizedTrips = await db.trip.count({ where: { status: 'FINALIZADA' } });
    const totalFare = await db.trip.aggregate({
      where: { status: 'FINALIZADA' },
      _sum: { fareAmount: true, distanceKm: true },
    });

    // ── Step 2: Build context string for LLM ──────────────
    const driversList = allDrivers
      .filter(d => d.role === 'MOTORISTA')
      .map(d => `  - ${d.name} (ID: ${d.id}, Placa: ${d.licensePlate || 'N/A'}, Tel: ${d.phone || 'N/A'})`)
      .join('\n');

    const activeTripsList = activeTrips.length > 0
      ? activeTrips.map(t => `  - Motorista: ${t.driver.name}, De: ${t.origin}, Para: ${t.destination}, Distância: ${t.distanceKm}km, Valor: R$${t.fareAmount.toFixed(2)}, Início: ${t.startedAt.toLocaleString('pt-BR')}`).join('\n')
      : '  Nenhuma corrida ativa no momento.';

    const activeLocationsList = activeLocations.length > 0
      ? activeLocations.map(l => `  - Motorista: ${l.driver.name} (Placa: ${l.driver.licensePlate || 'N/A'}), Lat: ${l.latitude.toFixed(4)}, Lng: ${l.longitude.toFixed(4)}, Última atualização: ${l.updatedAt.toLocaleString('pt-BR')}`).join('\n')
      : '  Nenhum motorista com localização ativa.';

    const recentTripsList = recentTrips.slice(0, 10).map(t =>
      `  - Motorista: ${t.driver.name}, De: ${t.origin}, Para: ${t.destination}, ${t.distanceKm}km, R$${t.fareAmount.toFixed(2)}, Status: ${t.status}, Data: ${t.startedAt.toLocaleString('pt-BR')}`
    ).join('\n');

    const pricingInfo = settings
      ? `Bandeirada: R$${settings.flagRate.toFixed(2)}, Valor por Km: R$${settings.pricePerKm.toFixed(2)}`
      : 'Bandeirada: R$5.50, Valor por Km: R$3.20';

    const dbContext = `
=== DADOS ATUAIS DO SISTEMA TAXICONTROL PRO ===

 MOTORISTAS CADASTRADOS:
${driversList || '  Nenhum motorista cadastrado.'}

 CORRIDAS ATIVAS (EM ANDAMENTO):
${activeTripsList}

 LOCALIZAÇÕES EM TEMPO REAL (motoristas ativos nos últimos 3 min):
${activeLocationsList}

 ÚLTIMAS CORRIDAS FINALIZADAS:
${recentTripsList || '  Nenhuma corrida finalizada ainda.'}

 RESUMO GERAL:
- Total de motoristas: ${allDrivers.filter(d => d.role === 'MOTORISTA').length}
- Total de corridas: ${totalTrips}
- Corridas finalizadas: ${finalizedTrips}
- Faturamento total: R$${((totalFare._sum.fareAmount || 0)).toFixed(2)}
- Distância total percorrida: ${((totalFare._sum.distanceKm || 0)).toFixed(2)} km
- Tarifa atual: ${pricingInfo}
- Fórmula: Bandeirada + (Distância × Valor por Km)

 DATA/HORA ATUAL: ${new Date().toLocaleString('pt-BR')}
`.trim();

    // ── Step 3: Call LLM ──────────────────────────────────
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const systemPrompt = `Você é o Co-Piloto IA do sistema TaxiControl Pro, um MicroSaaS de gerenciamento de táxi. Você é um assistente virtual inteligente, prestativo e que fala em português brasileiro de forma natural e amigável.

Seu papel é responder perguntas sobre o sistema, fornecer dados em tempo real sobre motoristas, corridas, localizações e relatórios financeiros.

REGRAS IMPORTANTES:
- Sempre responda em português brasileiro
- Seja conciso mas informativo
- Use dados reais fornecidos no contexto para responder
- Formate valores monetários como R$ X,XX
- Quando um motorista estiver em corrida ativa, informe origem, destino e valor estimado
- Quando possível, sugira ações úteis ao usuário
- Se não souber algo com base nos dados, diga claramente
- Nunca invente dados que não estão no contexto
- Responda perguntas sobre cálculo de tarifas usando a fórmula fornecida`;

    // Build conversation history
    const messages: Array<{ role: string; content: string }> = [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: `Aqui estão os dados atuais do sistema. Use-os para responder às perguntas do usuário:\n\n${dbContext}` },
      { role: 'assistant', content: 'Entendi. Tenho acesso aos dados do sistema TaxiControl Pro. Estou pronto para ajudar com informações sobre motoristas, corridas, localizações e relatórios. O que gostaria de saber?' },
    ];

    // Add conversation history (last 10 messages for context)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta. Tente novamente.';

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Copilot error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.' },
      { status: 500 }
    );
  }
}
