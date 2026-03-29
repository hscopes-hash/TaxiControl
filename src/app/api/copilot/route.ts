import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/copilot - Co-Piloto IA com dados do banco
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const msg = message.toLowerCase().trim();

    // ── Buscar todos os dados do banco ───────────────
    const [allUsers, allTrips, settings] = await Promise.all([
      db.user.findMany({
        select: { id: true, name: true, role: true, phone: true, licensePlate: true },
      }),
      db.trip.findMany({
        include: { driver: { select: { id: true, name: true, licensePlate: true } } },
        orderBy: { startedAt: 'desc' },
        take: 100,
      }),
      db.settings.findFirst(),
    ]);

    const drivers = allUsers.filter(u => u.role === 'MOTORISTA');
    const finalizedTrips = allTrips.filter(t => t.status === 'FINALIZADA');
    const activeTrips = allTrips.filter(t => t.status === 'EM_ANDAMENTO');
    const cancelledTrips = allTrips.filter(t => t.status === 'CANCELADA');

    const totalFare = finalizedTrips.reduce((s, t) => s + t.fareAmount, 0);
    const totalDist = finalizedTrips.reduce((s, t) => s + t.distanceKm, 0);
    const avgFare = finalizedTrips.length > 0 ? totalFare / finalizedTrips.length : 0;

    // Corridas de hoje
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTrips = finalizedTrips.filter(t => t.startedAt?.toISOString().split('T')[0] === todayStr);
    const todayFare = todayTrips.reduce((s, t) => s + t.fareAmount, 0);
    const todayDist = todayTrips.reduce((s, t) => s + t.distanceKm, 0);

    // Agrupar por motorista
    const byDriver: Record<string, { name: string; plate: string | null; phone: string | null; trips: number; fare: number; dist: number }> = {};
    for (const dr of drivers) {
      byDriver[dr.id] = { name: dr.name, plate: dr.licensePlate, phone: dr.phone, trips: 0, fare: 0, dist: 0 };
    }
    for (const t of finalizedTrips) {
      const dr = byDriver[t.driverId];
      if (dr) { dr.trips++; dr.fare += t.fareAmount; dr.dist += t.distanceKm; }
    }

    const flagRate = settings?.flagRate || 5.5;
    const pricePerKm = settings?.pricePerKm || 3.2;

    // ── Montar contexto com todos os dados do banco ──
    const dataContext = buildDataContext({
      drivers, finalizedTrips, activeTrips, cancelledTrips,
      totalFare, totalDist, avgFare,
      todayTrips, todayFare, todayDist,
      byDriver, flagRate, pricePerKm,
    });

    // ── Tentar LLM primeiro ──────────────────────────
    let aiResponse: string | null = null;

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;

      const zaiPromise = ZAI.create();
      const createTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      );
      const zai = await Promise.race([zaiPromise, createTimeout]);

      const systemPrompt = `Você é o Co-Piloto IA do TaxiControl Pro, um sistema de gestão de frotas de táxi. Responda em português brasileiro de forma concisa e amigável.

REGRAS ESTRITAS:
- Use APENAS os dados fornecidos abaixo. NUNCA invente dados que não estejam listados.
- Se a pergunta for sobre algo que não está nos dados, diga que não tem essa informação no sistema.
- Formate valores monetários como R$ X,XX.
- Quando citar corridas, inclua sempre partida e chegada se disponível.
- Não use emojis em excesso.`;

      const completionPromise = zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: `DADOS DO SISTEMA (use APENAS estes dados para responder):\n\n${dataContext}` },
          { role: 'assistant', content: 'Entendi. Vou responder usando apenas os dados fornecidos. Pode perguntar.' },
          { role: 'user', content: message },
        ],
        thinking: { type: 'disabled' },
      });

      const completionTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      );

      const completion = await Promise.race([completionPromise, completionTimeout]);
      const content = completion.choices[0]?.message?.content || '';

      if (content.trim().length > 10) {
        aiResponse = content.trim();
      }
    } catch (llmError) {
      console.error('LLM indisponível, usando fallback:', llmError instanceof Error ? llmError.message : llmError);
    }

    // ── Fallback: resposta direta dos dados ──────────
    if (!aiResponse) {
      aiResponse = generateFallback(msg, {
        drivers, finalizedTrips, activeTrips, cancelledTrips,
        totalFare, totalDist, avgFare,
        todayTrips, todayFare, todayDist,
        byDriver, flagRate, pricePerKm,
      });
    }

    return NextResponse.json({ response: aiResponse, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Copilot error:', error);
    return NextResponse.json(
      { error: 'Erro interno', response: 'Erro ao consultar dados. Tente novamente.' },
      { status: 500 }
    );
  }
}

// ── Monta o texto com todos os dados do banco ────────
function buildDataContext(d: any): string {
  let ctx = '';

  // Resumo geral
  ctx += `RESUMO GERAL:\n`;
  ctx += `- Total de motoristas: ${d.drivers.length}\n`;
  ctx += `- Corridas finalizadas: ${d.finalizedTrips.length}\n`;
  ctx += `- Corridas canceladas: ${d.cancelledTrips.length}\n`;
  ctx += `- Corridas em andamento: ${d.activeTrips.length}\n`;
  ctx += `- Faturamento total: R$${d.totalFare.toFixed(2)}\n`;
  ctx += `- Distância total: ${d.totalDist.toFixed(1)} km\n`;
  ctx += `- Ticket médio: R$${d.avgFare.toFixed(2)}\n`;
  ctx += `- Bandeirada: R$${d.flagRate.toFixed(2)}\n`;
  ctx += `- Valor por km: R$${d.pricePerKm.toFixed(2)}\n`;
  ctx += `- Hoje: ${d.todayTrips.length} corrida(s), R$${d.todayFare.toFixed(2)}, ${d.todayDist.toFixed(1)} km\n\n`;

  // Motoristas
  if (d.drivers.length > 0) {
    ctx += `MOTORISTAS:\n`;
    for (const [, s] of Object.entries(d.byDriver)) {
      ctx += `- ${s.name}${s.plate ? ` (Placa: ${s.plate})` : ''}${s.phone ? ` (Tel: ${s.phone})` : ''}: ${s.trips} corrida(s), faturamento R$${s.fare.toFixed(2)}, ${s.dist.toFixed(1)} km\n`;
    }
    ctx += '\n';
  }

  // Corridas ativas
  if (d.activeTrips.length > 0) {
    ctx += `CORRIDAS EM ANDAMENTO:\n`;
    for (const t of d.activeTrips) {
      const partida = t.startedAt ? new Date(t.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      ctx += `- Motorista: ${t.driver.name}, De: ${t.origin}, Para: ${t.destination}, ${t.distanceKm} km, R$${t.fareAmount.toFixed(2)}, Partida: ${partida}\n`;
    }
    ctx += '\n';
  }

  // Últimas corridas
  if (d.finalizedTrips.length > 0) {
    ctx += `ÚLTIMAS CORRIDAS FINALIZADAS:\n`;
    for (const t of d.finalizedTrips.slice(0, 20)) {
      const partida = t.startedAt ? new Date(t.startedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
      const chegada = t.endedAt ? new Date(t.endedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      ctx += `- Motorista: ${t.driver.name}, De: ${t.origin}, Para: ${t.destination}, ${t.distanceKm} km, R$${t.fareAmount.toFixed(2)}, Partida: ${partida}, Chegada: ${chegada}\n`;
    }
  }

  return ctx;
}

// ── Fallback quando LLM não está disponível ───────────
function generateFallback(msg: string, d: any): string {
  // Motorista específico por nome
  for (const driver of d.drivers) {
    const nome = driver.name.toLowerCase();
    const placa = (driver.licensePlate || '').toLowerCase();
    if (msg.includes(nome) || (placa && msg.includes(placa))) {
      const stats = d.byDriver[driver.id];
      const driverActive = d.activeTrips.filter((t: any) => t.driverId === driver.id);
      const driverRecent = d.finalizedTrips.filter((t: any) => t.driverId === driver.id).slice(0, 5);
      const driverToday = d.todayTrips.filter((t: any) => t.driverId === driver.id);
      const todayFareDriver = driverToday.reduce((s: number, t: any) => s + t.fareAmount, 0);

      let r = `**${driver.name}**`;
      if (driver.licensePlate) r += ` | Placa: ${driver.licensePlate}`;
      if (driver.phone) r += ` | Tel: ${driver.phone}`;

      if (driverActive.length > 0) {
        r += `\n\nCorrida em andamento:`;
        for (const t of driverActive) {
          r += `\n  De: ${t.origin}\n  Para: ${t.destination}\n  ${t.distanceKm}km - R$${t.fareAmount.toFixed(2)}`;
        }
      } else {
        r += `\n\nSem corrida ativa.`;
      }

      if (stats) {
        r += `\n\nResumo: ${stats.trips} corrida(s), R$${stats.fare.toFixed(2)}, ${stats.dist.toFixed(1)} km`;
        if (stats.trips > 0) r += `, ticket medio R$${(stats.fare / stats.trips).toFixed(2)}`;
      }

      if (driverToday.length > 0) r += `\n\nHoje: ${driverToday.length} corrida(s), R$${todayFareDriver.toFixed(2)}`;

      if (driverRecent.length > 0) {
        r += `\n\nUltimas corridas:`;
        for (const t of driverRecent) {
          const p = t.startedAt ? new Date(t.startedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
          const c = t.endedAt ? new Date(t.endedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
          r += `\n  ${p} | ${t.origin} -> ${t.destination} | ${t.distanceKm}km | R$${t.fareAmount.toFixed(2)}${c ? ` | Chegada: ${c}` : ''}`;
        }
      }
      return r;
    }
  }

  // Corridas ativas
  if (msg.includes('ativa') || msg.includes('andamento') || msg.includes('agora')) {
    if (d.activeTrips.length === 0) return 'Nenhuma corrida em andamento.';
    let r = `**${d.activeTrips.length} corrida(s) em andamento:**\n`;
    for (const t of d.activeTrips) r += `\n${t.driver.name}: ${t.origin} -> ${t.destination} | ${t.distanceKm}km | R$${t.fareAmount.toFixed(2)}`;
    return r;
  }

  // Faturamento
  if (msg.includes('faturamento') || msg.includes('ganhou') || msg.includes('financeir') || msg.includes('receita') || msg.includes('dinheiro')) {
    return `**Resumo financeiro:**\n- Corridas: ${d.finalizedTrips.length}\n- Faturamento total: R$${d.totalFare.toFixed(2)}\n- Distancia: ${d.totalDist.toFixed(1)} km\n- Ticket medio: R$${d.avgFare.toFixed(2)}\n\n**Hoje:** ${d.todayTrips.length} corrida(s), R$${d.todayFare.toFixed(2)}`;
  }

  // Tarifa
  if (msg.includes('tarifa') || msg.includes('preço') || msg.includes('valor') || msg.includes('custa') || msg.includes('calcul')) {
    return `**Tarifa:** Bandeirada R$${d.flagRate.toFixed(2)} + R$${d.pricePerKm.toFixed(2)}/km\n\n5km = R$${(d.flagRate + 5 * d.pricePerKm).toFixed(2)}\n10km = R$${(d.flagRate + 10 * d.pricePerKm).toFixed(2)}\n20km = R$${(d.flagRate + 20 * d.pricePerKm).toFixed(2)}`;
  }

  // Hoje
  if (msg.includes('hoje') || msg.includes('dia')) {
    let r = `**Hoje:** ${d.todayTrips.length} corrida(s), R$${d.todayFare.toFixed(2)}, ${d.todayDist.toFixed(1)} km`;
    if (d.todayTrips.length > 0) {
      r += '\n\n';
      for (const t of d.todayTrips) r += `- ${t.driver.name}: ${t.origin} -> ${t.destination} | R$${t.fareAmount.toFixed(2)}\n`;
    }
    return r;
  }

  // Motoristas
  if (msg.includes('motorista') || msg.includes('quantos') || msg.includes('lista') || msg.includes('quem')) {
    let r = `**${d.drivers.length} motorista(s):**\n`;
    for (const [, s] of Object.entries(d.byDriver)) r += `- ${s.name}${s.plate ? ` (${s.plate})` : ''}: ${s.trips} corrida(s), R$${s.fare.toFixed(2)}\n`;
    return r;
  }

  // Ranking
  if (msg.includes('ranking') || msg.includes('melhor') || msg.includes('mais') || msg.includes('top')) {
    const sorted = Object.values(d.byDriver).sort((a: any, b: any) => b.fare - a.fare);
    let r = '**Ranking por faturamento:**\n';
    sorted.forEach((s: any, i: number) => r += `${i + 1}. ${s.name}: ${s.trips} corrida(s), R$${s.fare.toFixed(2)}\n`);
    return r;
  }

  // Ultimas corridas
  if (msg.includes('última') || msg.includes('recente') || msg.includes('históric')) {
    const recent = d.finalizedTrips.slice(0, 10);
    if (recent.length === 0) return 'Nenhuma corrida finalizada.';
    let r = `**Ultimas ${recent.length} corridas:**\n`;
    for (const t of recent) {
      const p = t.startedAt ? new Date(t.startedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
      r += `- ${t.driver.name}: ${t.origin} -> ${t.destination} | ${t.distanceKm}km | R$${t.fareAmount.toFixed(2)} | ${p}\n`;
    }
    return r;
  }

  // Saudação
  if (msg.includes('olá') || msg.includes('oi') || msg.includes('bom dia') || msg.includes('boa tarde') || msg.includes('boa noite')) {
    return `Ola! Resumo atual: ${d.drivers.length} motorista(s), ${d.finalizedTrips.length} corrida(s), faturamento R$${d.totalFare.toFixed(2)}. Hoje: ${d.todayTrips.length} corrida(s), R$${d.todayFare.toFixed(2)}.\n\nPergunte sobre motoristas, corridas, faturamento, tarifas ou historico.`;
  }

  // Canceladas
  if (msg.includes('cancel')) return `${d.cancelledTrips.length} corrida(s) cancelada(s) de ${d.finalizedTrips.length + d.cancelledTrips.length} total.`;

  // Resumo geral
  let r = `**Resumo:**\n- Motoristas: ${d.drivers.length}\n- Corridas: ${d.finalizedTrips.length}\n- Faturamento: R$${d.totalFare.toFixed(2)}\n- Hoje: ${d.todayTrips.length} corrida(s), R$${d.todayFare.toFixed(2)}\n- Tarifa: R$${d.flagRate.toFixed(2)} + R$${d.pricePerKm.toFixed(2)}/km\n`;

  if (d.activeTrips.length > 0) {
    r += `\n**Em andamento:** ${d.activeTrips.length} corrida(s)\n`;
    for (const t of d.activeTrips) r += `- ${t.driver.name}: ${t.origin} -> ${t.destination}\n`;
  }

  const sorted = Object.values(d.byDriver).sort((a: any, b: any) => b.fare - a.fare);
  if (sorted.length > 0) {
    r += '\n**Top motoristas:**\n';
    sorted.slice(0, 5).forEach((s: any, i: number) => r += `${i + 1}. ${s.name}: ${s.trips} corrida(s), R$${s.fare.toFixed(2)}\n`);
  }

  return r;
}
