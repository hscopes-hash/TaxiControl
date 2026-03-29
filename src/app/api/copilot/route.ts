import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/copilot - Co-Piloto com dados do banco
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const msg = message.toLowerCase().trim();

    // ── Buscar dados do banco ──────────────────────────
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
    for (const d of drivers) {
      byDriver[d.id] = { name: d.name, plate: d.licensePlate, phone: d.phone, trips: 0, fare: 0, dist: 0 };
    }
    for (const t of finalizedTrips) {
      const d = byDriver[t.driverId];
      if (d) { d.trips++; d.fare += t.fareAmount; d.dist += t.distanceKm; }
    }

    const flagRate = settings?.flagRate || 5.5;
    const pricePerKm = settings?.pricePerKm || 3.2;

    // ── Resposta baseada nos dados ─────────────────────
    const response = generateResponse(msg, {
      drivers, finalizedTrips, activeTrips, cancelledTrips, allTrips,
      totalFare, totalDist, avgFare,
      todayTrips, todayFare, todayDist,
      byDriver, flagRate, pricePerKm,
    });

    return NextResponse.json({ response, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Copilot error:', error);
    return NextResponse.json(
      { error: 'Erro interno', response: 'Erro ao consultar dados. Tente novamente.' },
      { status: 500 }
    );
  }
}

// ── Gerador de respostas ────────────────────────────────
function generateResponse(msg: string, d: any): string {
  // ── Motorista específico por nome ──────────────────
  for (const driver of d.drivers) {
    const nome = driver.name.toLowerCase();
    const placa = (driver.licensePlate || '').toLowerCase();
    if (msg.includes(nome) || (placa && msg.includes(placa))) {
      const stats = d.byDriver[driver.id];
      const driverActive = d.activeTrips.filter(t => t.driverId === driver.id);
      const driverRecent = d.finalizedTrips.filter(t => t.driverId === driver.id).slice(0, 5);
      const driverToday = d.todayTrips.filter(t => t.driverId === driver.id);
      const todayFareDriver = driverToday.reduce((s: number, t: any) => s + t.fareAmount, 0);

      let r = `**${driver.name}**`;
      if (driver.plate) r += ` | Placa: ${driver.plate}`;
      if (driver.phone) r += ` | Tel: ${driver.phone}`;

      if (driverActive.length > 0) {
        r += `\n\n🟢 Corrida em andamento:`;
        for (const t of driverActive) {
          r += `\n  De: ${t.origin}\n  Para: ${t.destination}\n  ${t.distanceKm}km - R$${t.fareAmount.toFixed(2)}`;
        }
      } else {
        r += `\n\n⚪ Sem corrida ativa no momento.`;
      }

      if (stats) {
        r += `\n\n📊 Resumo geral:`;
        r += `\n  Total de corridas: ${stats.trips}`;
        r += `\n  Faturamento: R$${stats.fare.toFixed(2)}`;
        r += `\n  Distância: ${stats.dist.toFixed(1)} km`;
        r += `\n  Ticket médio: R$${stats.trips > 0 ? (stats.fare / stats.trips).toFixed(2) : '0.00'}`;
      }

      if (driverToday.length > 0) {
        r += `\n\n📅 Hoje: ${driverToday.length} corrida(s), R$${todayFareDriver.toFixed(2)}`;
      }

      if (driverRecent.length > 0) {
        r += `\n\nÚltimas corridas:`;
        for (const t of driverRecent) {
          const hora = t.startedAt ? new Date(t.startedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
          const chegada = t.endedAt ? new Date(t.endedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
          r += `\n  ${hora} | ${t.origin} → ${t.destination} | ${t.distanceKm}km | R$${t.fareAmount.toFixed(2)}${chegada ? ` | Chegada: ${chegada}` : ''}`;
        }
      }

      return r;
    }
  }

  // ── Corridas ativas ────────────────────────────────
  if (msg.includes('ativa') || msg.includes('andamento') || msg.includes('agora')) {
    if (d.activeTrips.length === 0) return 'Nenhuma corrida em andamento no momento.';
    let r = `**${d.activeTrips.length} corrida(s) em andamento:**\n`;
    for (const t of d.activeTrips) {
      r += `\n• ${t.driver.name}: ${t.origin} → ${t.destination} | ${t.distanceKm}km | R$${t.fareAmount.toFixed(2)}`;
    }
    return r;
  }

  // ── Tarifa / preço ────────────────────────────────
  if (msg.includes('tarifa') || msg.includes('preço') || msg.includes('valor') || msg.includes('custa') || msg.includes('bandeiraira') || msg.includes('calcul')) {
    return `**Tarifa atual:**\n• Bandeirada: R$${d.flagRate.toFixed(2)}\n• Valor por km: R$${d.pricePerKm.toFixed(2)}\n• Fórmula: Bandeirada + (km × valor/km)\n\nExemplos:\n• 5 km = R$${(d.flagRate + 5 * d.pricePerKm).toFixed(2)}\n• 10 km = R$${(d.flagRate + 10 * d.pricePerKm).toFixed(2)}\n• 15 km = R$${(d.flagRate + 15 * d.pricePerKm).toFixed(2)}\n• 20 km = R$${(d.flagRate + 20 * d.pricePerKm).toFixed(2)}`;
  }

  // ── Faturamento / financeiro ───────────────────────
  if (msg.includes('faturamento') || msg.includes('ganhou') || msg.includes('financeir') || msg.includes('receita') || msg.includes('dinheiro') || msg.includes('lucro')) {
    let r = `**Resumo financeiro:**\n\n`;
    r += `• Total de corridas: ${d.finalizedTrips.length}\n`;
    r += `• Faturamento total: R$${d.totalFare.toFixed(2)}\n`;
    r += `• Distância total: ${d.totalDist.toFixed(1)} km\n`;
    r += `• Ticket médio: R$${d.avgFare.toFixed(2)}\n\n`;

    r += `**Hoje:**\n• Corridas: ${d.todayTrips.length}\n• Faturamento: R$${d.todayFare.toFixed(2)}\n• Distância: ${d.todayDist.toFixed(1)} km`;

    return r;
  }

  // ── Hoje ───────────────────────────────────────────
  if (msg.includes('hoje') || msg.includes('dia')) {
    let r = `**Resumo de hoje:**\n`;
    r += `• Corridas finalizadas: ${d.todayTrips.length}\n`;
    r += `• Faturamento: R$${d.todayFare.toFixed(2)}\n`;
    r += `• Distância: ${d.todayDist.toFixed(1)} km`;

    if (d.activeTrips.length > 0) {
      r += `\n\n🟢 ${d.activeTrips.length} corrida(s) em andamento agora.`;
    }

    if (d.todayTrips.length > 0) {
      r += `\n\nCorridas de hoje:`;
      for (const t of d.todayTrips) {
        r += `\n• ${t.driver.name}: ${t.origin} → ${t.destination} | ${t.distanceKm}km | R$${t.fareAmount.toFixed(2)}`;
      }
    }

    return r;
  }

  // ── Motoristas cadastrados ─────────────────────────
  if (msg.includes('motorista') || msg.includes('quantos') || msg.includes('lista') || msg.includes('quem')) {
    let r = `**${d.drivers.length} motorista(s) cadastrado(s):**\n\n`;

    for (const [, stats] of Object.entries(d.byDriver)) {
      r += `• **${stats.name}**${stats.plate ? ` (${stats.plate})` : ''} — ${stats.trips} corrida(s), R$${stats.fare.toFixed(2)}\n`;
    }

    r += `\nTotal faturado: R$${d.totalFare.toFixed(2)}`;
    return r;
  }

  // ── Ranking / melhor / mais ────────────────────────
  if (msg.includes('ranking') || msg.includes('melhor') || msg.includes('mais') || msg.includes('top')) {
    const sorted = Object.values(d.byDriver).sort((a, b) => b.fare - a.fare);
    let r = `**Ranking de motoristas por faturamento:**\n\n`;
    sorted.forEach((s, i) => {
      r += `${i + 1}. **${s.name}** — ${s.trips} corrida(s), R$${s.fare.toFixed(2)}, ${s.dist.toFixed(1)}km\n`;
    });
    return r;
  }

  // ── Últimas corridas / histórico ───────────────────
  if (msg.includes('última') || msg.includes('recente') || msg.includes('históric')) {
    const recent = d.finalizedTrips.slice(0, 10);
    if (recent.length === 0) return 'Nenhuma corrida finalizada registrada.';

    let r = `**Últimas ${recent.length} corridas:**\n`;
    for (const t of recent) {
      const hora = t.startedAt ? new Date(t.startedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
      const chegada = t.endedAt ? new Date(t.endedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      r += `\n• ${t.driver.name}: ${t.origin} → ${t.destination} | ${t.distanceKm}km | R$${t.fareAmount.toFixed(2)} | ${hora}${chegada ? ` → ${chegada}` : ''}`;
    }

    return r;
  }

  // ── Corridas canceladas ────────────────────────────
  if (msg.includes('cancel')) {
    return `**${d.cancelledTrips.length} corrida(s) cancelada(s)** de um total de ${d.allTrips.length} corridas.`;
  }

  // ── Saudação ───────────────────────────────────────
  if (msg.includes('olá') || msg.includes('oi') || msg.includes('bom dia') || msg.includes('boa tarde') || msg.includes('boa noite') || msg.includes('tudo bem')) {
    return `Olá! Aqui está o resumo atual:\n\n• ${d.drivers.length} motorista(s)\n• ${d.finalizedTrips.length} corrida(s) finalizada(s)\n• Faturamento: R$${d.totalFare.toFixed(2)}\n• Hoje: ${d.todayTrips.length} corrida(s), R$${d.todayFare.toFixed(2)}\n\nPergunte sobre motoristas, corridas, faturamento, tarifas ou histórico.`;
  }

  // ── Resumo geral (fallback para qualquer pergunta) ─
  let r = `**Resumo do sistema:**\n\n`;
  r += `• Motoristas: ${d.drivers.length}\n`;
  r += `• Corridas finalizadas: ${d.finalizedTrips.length}\n`;
  r += `• Corridas canceladas: ${d.cancelledTrips.length}\n`;
  r += `• Faturamento total: R$${d.totalFare.toFixed(2)}\n`;
  r += `• Distância total: ${d.totalDist.toFixed(1)} km\n`;
  r += `• Ticket médio: R$${d.avgFare.toFixed(2)}\n`;
  r += `• Tarifa: R$${d.flagRate.toFixed(2)} + R$${d.pricePerKm.toFixed(2)}/km\n\n`;

  if (d.todayTrips.length > 0) {
    r += `**Hoje:** ${d.todayTrips.length} corrida(s), R$${d.todayFare.toFixed(2)}\n\n`;
  }

  if (d.activeTrips.length > 0) {
    r += `**Em andamento:** ${d.activeTrips.length} corrida(s)\n`;
    for (const t of d.activeTrips) {
      r += `  • ${t.driver.name}: ${t.origin} → ${t.destination}\n`;
    }
    r += '\n';
  }

  // Top 3 motoristas
  const sorted = Object.values(d.byDriver).sort((a, b) => b.fare - a.fare);
  if (sorted.length > 0) {
    r += `**Top motoristas:**\n`;
    sorted.slice(0, 5).forEach((s, i) => {
      r += `  ${i + 1}. ${s.name}: ${s.trips} corrida(s), R$${s.fare.toFixed(2)}\n`;
    });
  }

  r += `\nPergunte algo específico como:\n  • "motoristas"\n  • "faturamento"\n  • "hoje"\n  • " João"\n  • "últimas corridas"\n  • "ranking"\n  • "tarifa"`;

  return r;
}
