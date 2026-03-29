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
      .map(d => `  - ${d.name} (Placa: ${d.licensePlate || 'N/A'}, Tel: ${d.phone || 'N/A'})`)
      .join('\n');

    const activeTripsList = activeTrips.length > 0
      ? activeTrips.map(t => `  - Motorista: ${t.driver.name}, De: ${t.origin}, Para: ${t.destination}, ${t.distanceKm}km, R$${t.fareAmount.toFixed(2)}`).join('\n')
      : '  Nenhuma corrida ativa.';

    const activeLocationsList = activeLocations.length > 0
      ? activeLocations.map(l => `  - ${l.driver.name} (Placa: ${l.driver.licensePlate || 'N/A'}), Lat: ${l.latitude.toFixed(4)}, Lng: ${l.longitude.toFixed(4)}`).join('\n')
      : '  Nenhum motorista com localização ativa.';

    const recentTripsList = recentTrips.slice(0, 10).map(t =>
      `  - ${t.driver.name}, De: ${t.origin}, Para: ${t.destination}, ${t.distanceKm}km, R$${t.fareAmount.toFixed(2)}, ${t.status}`
    ).join('\n');

    const pricingInfo = settings
      ? `Bandeirada: R$${settings.flagRate.toFixed(2)}, Valor por Km: R$${settings.pricePerKm.toFixed(2)}`
      : 'Bandeirada: R$5.50, Valor por Km: R$3.20';

    const dbContext = `
DADOS ATUAIS DO SISTEMA TAXICONTROL PRO:

MOTORISTAS CADASTRADOS:
${driversList || '  Nenhum motorista cadastrado.'}

CORRIDAS ATIVAS:
${activeTripsList}

LOCALIZAÇÕES EM TEMPO REAL:
${activeLocationsList}

ÚLTIMAS CORRIDAS FINALIZADAS:
${recentTripsList || '  Nenhuma corrida.'}

RESUMO GERAL:
- Motoristas: ${allDrivers.filter(d => d.role === 'MOTORISTA').length}
- Total de corridas: ${totalTrips}
- Corridas finalizadas: ${finalizedTrips}
- Faturamento total: R$${((totalFare._sum.fareAmount || 0)).toFixed(2)}
- Distância total: ${((totalFare._sum.distanceKm || 0)).toFixed(2)} km
- Tarifa: ${pricingInfo}
- Fórmula: Bandeirada + (Distância × Valor por Km)
- Data/Hora: ${new Date().toLocaleString('pt-BR')}`.trim();

    // ── Step 3: Call LLM with retry ──────────────────────────
    const systemPrompt = `Você é o Co-Piloto IA do TaxiControl Pro. Responda em português brasileiro de forma concisa e amigável. Use os dados fornecidos. Formate valores como R$ X,XX. Nunca invente dados.`;

    const chatMessages: Array<{ role: string; content: string }> = [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: `Dados do sistema:\n${dbContext}` },
      { role: 'assistant', content: 'Entendi os dados. Pronto para responder.' },
    ];

    const recentHistory = history.slice(-8);
    for (const msg of recentHistory) {
      chatMessages.push({ role: msg.role, content: msg.content });
    }
    chatMessages.push({ role: 'user', content: message });

    // Try LLM with timeout wrapper (25s for Vercel serverless limit)
    let aiResponse: string;

    try {
      // Dynamic import to avoid issues in serverless
      const ZAI = (await import('z-ai-web-dev-sdk')).default;

      // Create with timeout
      const zaiPromise = ZAI.create();
      const createTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SDK init timeout')), 10000)
      );
      const zai = await Promise.race([zaiPromise, createTimeout]);

      const completionPromise = zai.chat.completions.create({
        messages: chatMessages,
        thinking: { type: 'disabled' },
      });

      const completionTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM timeout')), 20000)
      );

      const completion = await Promise.race([completionPromise, completionTimeout]);
      aiResponse = completion.choices[0]?.message?.content || '';
    } catch (llmError) {
      console.error('LLM Error:', llmError);

      // Fallback: generate a response based on the data without LLM
      aiResponse = generateFallbackResponse(message, {
        allDrivers,
        activeTrips,
        recentTrips,
        activeLocations,
        settings,
        totalTrips,
        finalizedTrips,
        totalFare,
      });
    }

    if (!aiResponse.trim()) {
      aiResponse = 'Desculpe, não consegui gerar uma resposta. Tente novamente.';
    }

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Copilot error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', response: 'Desculpe, ocorreu um erro. Tente novamente.' },
      { status: 500 }
    );
  }
}

// ── Fallback response generator (when LLM is unavailable) ──
function generateFallbackResponse(
  message: string,
  data: {
    allDrivers: Array<{ id: string; name: string; email: string; role: string; phone: string | null; licensePlate: string | null }>;
    activeTrips: Array<{ driver: { name: string } }>;
    recentTrips: Array<{ driver: { name: string }; origin: string; destination: string; distanceKm: number; fareAmount: number; status: string; startedAt: Date }>;
    activeLocations: Array<{ driver: { name: string; licensePlate: string | null }; latitude: number; longitude: number }>;
    settings: { flagRate: number; pricePerKm: number } | null;
    totalTrips: number;
    finalizedTrips: number;
    totalFare: { _sum: { fareAmount: number | null; distanceKm: number | null } };
  }
) {
  const msg = message.toLowerCase();
  const drivers = data.allDrivers.filter(d => d.role === 'MOTORISTA');
  const flagRate = data.settings?.flagRate || 5.5;
  const pricePerKm = data.settings?.pricePerKm || 3.2;

  // Motoristas
  if (msg.includes('motorista') && (msg.includes('cadastrad') || msg.includes('quantos') || msg.includes('lista') || msg.includes('todos'))) {
    if (drivers.length === 0) return 'Nenhum motorista cadastrado no sistema.';
    return `Temos ${drivers.length} motorista(s) cadastrado(s):\n\n${drivers.map(d => `• ${d.name}${d.licensePlate ? ` (Placa: ${d.licensePlate})` : ''}${d.phone ? ` - ${d.phone}` : ''}`).join('\n')}`;
  }

  // Motorista específico
  for (const driver of drivers) {
    if (msg.includes(driver.name.toLowerCase()) || msg.includes(driver.licensePlate?.toLowerCase() || '')) {
      const activeTrip = data.activeTrips.find(t => t.driver.name === driver.name);
      let response = `📋 **${driver.name}**${driver.licensePlate ? ` | Placa: ${driver.licensePlate}` : ''}${driver.phone ? ` | Tel: ${driver.phone}` : ''}\n\n`;

      if (activeTrip) {
        response += `🟢 **Corrida em andamento:**\n• De: ${activeTrip.driver.name}\n• Status: Ativa\n\n`;
      } else {
        response += '⚪ Nenhuma corrida ativa no momento.\n\n';
      }

      const driverTrips = data.recentTrips.filter(t => t.driver.name === driver.name);
      if (driverTrips.length > 0) {
        response += `📊 Últimas corridas de ${driver.name}:\n`;
        driverTrips.slice(0, 3).forEach(t => {
          response += `• ${t.origin} → ${t.destination} | ${t.distanceKm}km | R$${t.fareAmount.toFixed(2)} | ${t.status}\n`;
        });
        const total = driverTrips.reduce((s, t) => s + t.fareAmount, 0);
        response += `\n💰 Faturamento recente: R$${total.toFixed(2)}`;
      } else {
        response += 'Nenhuma corrida registrada.';
      }
      return response;
    }
  }

  // Corridas ativas
  if (msg.includes('corrida ativa') || msg.includes('em andamento') || msg.includes('ativa agora')) {
    if (data.activeTrips.length === 0) return 'Nenhuma corrida ativa no momento.';
    return `🟢 Corridas em andamento (${data.activeTrips.length}):\n\n${data.activeTrips.map(t => `• ${t.driver.name} - R$${t.fareAmount.toFixed(2)}`).join('\n')}`;
  }

  // Faturamento / financeiro
  if (msg.includes('faturamento') || msg.includes('financeiro') || msg.includes('total') || msg.includes('quanto') || msg.includes('ganhou') || msg.includes('relatório')) {
    const totalFare = data.totalFare._sum.fareAmount || 0;
    const totalDist = data.totalFare._sum.distanceKm || 0;
    return `📊 **Resumo Financeiro:**\n\n• Corridas finalizadas: ${data.finalizedTrips}\n• Total de corridas: ${data.totalTrips}\n• Faturamento total: R$${totalFare.toFixed(2)}\n• Distância percorrida: ${totalDist.toFixed(2)} km\n• Ticket médio: ${data.finalizedTrips > 0 ? `R$${(totalFare / data.finalizedTrips).toFixed(2)}` : 'R$0.00'}`;
  }

  // Tarifa / preço
  if (msg.includes('tarifa') || msg.includes('preço') || msg.includes('valor') || msg.includes('quanto custa') || msg.includes('calcul')) {
    return `💰 **Tarifa Atual:**\n\n• Bandeirada: R$${flagRate.toFixed(2)}\n• Valor por Km: R$${pricePerKm.toFixed(2)}\n\n**Fórmula:** Bandeirada + (Distância × Valor por Km)\n\nExemplos:\n• 5 km = R$${(flagRate + 5 * pricePerKm).toFixed(2)}\n• 10 km = R$${(flagRate + 10 * pricePerKm).toFixed(2)}\n• 20 km = R$${(flagRate + 20 * pricePerKm).toFixed(2)}`;
  }

  // Localização
  if (msg.includes('localiza') || msg.includes('onde está') || msg.includes('gps') || msg.includes('mapa')) {
    if (data.activeLocations.length === 0) return 'Nenhum motorista com localização ativa nos últimos 3 minutos.';
    return `📍 **Motoristas com localização ativa:**\n\n${data.activeLocations.map(l => `• ${l.driver.name}${l.driver.licensePlate ? ` (${l.driver.licensePlate})` : ''}\n  Lat: ${l.latitude.toFixed(4)}, Lng: ${l.longitude.toFixed(4)}`).join('\n\n')}`;
  }

  // Saudação
  if (msg.includes('olá') || msg.includes('oi') || msg.includes('bom dia') || msg.includes('boa tarde') || msg.includes('boa noite')) {
    return `Olá! 👋 Estou aqui para ajudar. Você pode me perguntar sobre:\n\n• **Motoristas** cadastrados e status\n• **Corridas** ativas e histórico\n• **Faturamento** e relatórios\n• **Tarifas** e cálculos\n• **Localização** em tempo real\n\nO que gostaria de saber?`;
  }

  // Default
  return `Entendi sua pergunta sobre "${message.slice(0, 50)}". Posso ajudar com informações sobre motoristas, corridas, faturamento, tarifas e localizações do sistema. Tente perguntar algo como "quantos motoristas temos?" ou "qual o faturamento total?"`;
}
