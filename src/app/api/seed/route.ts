import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET - Permite acessar via navegador para fazer o seed
export async function GET() {
  return POST();
}

// POST - Endpoint principal do seed
export async function POST() {
  try {
    // ── Criar usuário administrador ────────────────────
    const adminEmail = 'admin@taxicontrol.com';
    const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await db.user.create({
        data: {
          name: 'Carlos Mendes',
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMINISTRADOR',
          phone: '(11) 99999-0000',
        },
      });
    }

    // ── Criar motoristas de demonstração ───────────────
    const driversData = [
      {
        email: 'motorista@taxicontrol.com',
        password: 'motorista123',
        name: 'João Silva',
        phone: '(11) 98888-1111',
        licensePlate: 'ABC-1D23',
      },
      {
        email: 'pedro@taxicontrol.com',
        password: 'pedro123',
        name: 'Pedro Santos',
        phone: '(11) 97777-2222',
        licensePlate: 'DEF-4E56',
      },
      {
        email: 'marcos@taxicontrol.com',
        password: 'marcos123',
        name: 'Marcos Oliveira',
        phone: '(11) 96666-3333',
        licensePlate: 'GHI-7F89',
      },
      {
        email: 'lucas@taxicontrol.com',
        password: 'lucas123',
        name: 'Lucas Ferreira',
        phone: '(11) 95555-4444',
        licensePlate: 'JKL-0G12',
      },
    ];

    const driverIds: Record<string, string> = {};

    for (const d of driversData) {
      const existing = await db.user.findUnique({ where: { email: d.email } });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(d.password, 12);
        const driver = await db.user.create({
          data: {
            name: d.name,
            email: d.email,
            password: hashedPassword,
            role: 'MOTORISTA',
            phone: d.phone,
            licensePlate: d.licensePlate,
          },
        });
        driverIds[d.email] = driver.id;
      } else {
        driverIds[d.email] = existing.id;
      }
    }

    // ── Criar configurações padrão ─────────────────────
    const existingSettings = await db.settings.findFirst();
    if (!existingSettings) {
      await db.settings.create({
        data: { flagRate: 5.5, pricePerKm: 3.2 },
      });
    }

    // ── Criar corridas de demonstração ─────────────────
    const joaoId = driverIds['motorista@taxicontrol.com'];
    const pedroId = driverIds['pedro@taxicontrol.com'];
    const marcosId = driverIds['marcos@taxicontrol.com'];
    const lucasId = driverIds['lucas@taxicontrol.com'];

    if (joaoId && pedroId && marcosId && lucasId) {
      const tripCount = await db.trip.count();
      if (tripCount === 0) {
        const agora = Date.now();
        const dia = 24 * 60 * 60 * 1000;
        const hora = 60 * 60 * 1000;

        const corridas = [
          // ── Corridas de João (motorista principal) ────
          {
            driverId: joaoId,
            origin: 'Av. Paulista, 1000 - Bela Vista',
            destination: 'Rua Augusta, 500 - Consolação',
            distanceKm: 3.2,
            fareAmount: Math.round((5.5 + 3.2 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 6 * dia - 8 * hora),
            endedAt: new Date(agora - 6 * dia - 8 * hora + 25 * 60000),
          },
          {
            driverId: joaoId,
            origin: 'Praça da Sé - Centro',
            destination: 'Shopping Morumbi - Morumbi',
            distanceKm: 12.5,
            fareAmount: Math.round((5.5 + 12.5 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 5 * dia - 9 * hora),
            endedAt: new Date(agora - 5 * dia - 9 * hora + 45 * 60000),
          },
          {
            driverId: joaoId,
            origin: 'Aeroporto de Guarulhos - Terminal 1',
            destination: 'Av. Brigadeiro Faria Lima, 1000 - Itaim Bibi',
            distanceKm: 25.8,
            fareAmount: Math.round((5.5 + 25.8 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 3 * dia - 14 * hora),
            endedAt: new Date(agora - 3 * dia - 14 * hora + 60 * 60000),
          },
          {
            driverId: joaoId,
            origin: 'Rua Oscar Freire, 900 - Jardim Paulista',
            destination: 'Terminal Rodoviário Tietê - Santana',
            distanceKm: 8.1,
            fareAmount: Math.round((5.5 + 8.1 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 2 * dia - 7 * hora),
            endedAt: new Date(agora - 2 * dia - 7 * hora + 30 * 60000),
          },
          {
            driverId: joaoId,
            origin: 'Pinheiros - Estação Pinheiros',
            destination: 'Moema - Av. Moema, 500',
            distanceKm: 6.7,
            fareAmount: Math.round((5.5 + 6.7 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 1 * dia - 18 * hora),
            endedAt: new Date(agora - 1 * dia - 18 * hora + 22 * 60000),
          },
          {
            driverId: joaoId,
            origin: 'Rua Haddock Lobo, 400 - Cerqueira César',
            destination: 'Rua da Consolação, 300 - Consolação',
            distanceKm: 2.4,
            fareAmount: Math.round((5.5 + 2.4 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 1 * dia - 10 * hora),
            endedAt: new Date(agora - 1 * dia - 10 * hora + 12 * 60000),
          },

          // ── Corridas de Pedro ──────────────────────────
          {
            driverId: pedroId,
            origin: 'Estação da Luz - Centro',
            destination: 'Mercado Municipal - Centro',
            distanceKm: 1.8,
            fareAmount: Math.round((5.5 + 1.8 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 5 * dia - 11 * hora),
            endedAt: new Date(agora - 5 * dia - 11 * hora + 10 * 60000),
          },
          {
            driverId: pedroId,
            origin: 'Aeroporto de Congonhas - Campo Belo',
            destination: 'Av. Paulista, 2000 - Bela Vista',
            distanceKm: 10.3,
            fareAmount: Math.round((5.5 + 10.3 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 4 * dia - 16 * hora),
            endedAt: new Date(agora - 4 * dia - 16 * hora + 38 * 60000),
          },
          {
            driverId: pedroId,
            origin: 'Shopping Ibirapuera - Moema',
            destination: 'Parque Ibirapuera - Portão 2',
            distanceKm: 3.0,
            fareAmount: Math.round((5.5 + 3.0 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 2 * dia - 13 * hora),
            endedAt: new Date(agora - 2 * dia - 13 * hora + 15 * 60000),
          },
          {
            driverId: pedroId,
            origin: 'Rua Augusta, 1200 - Consolação',
            destination: 'Liberdade - Praça da Liberdade',
            distanceKm: 4.5,
            fareAmount: Math.round((5.5 + 4.5 * 3.2) * 100) / 100,
            status: 'CANCELADA',
            startedAt: new Date(agora - 1 * dia - 20 * hora),
            endedAt: new Date(agora - 1 * dia - 20 * hora + 5 * 60000),
          },

          // ── Corridas de Marcos ─────────────────────────
          {
            driverId: marcosId,
            origin: 'Terminal Rodoviário Barra Funda',
            destination: 'Av. Rebouças, 600 - Pinheiros',
            distanceKm: 7.2,
            fareAmount: Math.round((5.5 + 7.2 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 4 * dia - 6 * hora),
            endedAt: new Date(agora - 4 * dia - 6 * hora + 28 * 60000),
          },
          {
            driverId: marcosId,
            origin: 'Av. São João, 1500 - Centro',
            destination: 'Shopping Paulista - Bela Vista',
            distanceKm: 5.1,
            fareAmount: Math.round((5.5 + 5.1 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 3 * dia - 8 * hora),
            endedAt: new Date(agora - 3 * dia - 8 * hora + 20 * 60000),
          },
          {
            driverId: marcosId,
            origin: 'Vila Madalena - Rua Aspicuelta, 400',
            destination: 'Av. Faria Lima, 2000 - Pinheiros',
            distanceKm: 4.8,
            fareAmount: Math.round((5.5 + 4.8 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 1 * dia - 15 * hora),
            endedAt: new Date(agora - 1 * dia - 15 * hora + 18 * 60000),
          },

          // ── Corridas de Lucas ──────────────────────────
          {
            driverId: lucasId,
            origin: 'Metrô Santana - Santana',
            destination: 'Shopping Center Norte - Zona Norte',
            distanceKm: 3.5,
            fareAmount: Math.round((5.5 + 3.5 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 3 * dia - 10 * hora),
            endedAt: new Date(agora - 3 * dia - 10 * hora + 14 * 60000),
          },
          {
            driverId: lucasId,
            origin: 'Rua Voluntários da Pátria, 2500 - Santana',
            destination: 'Terminal Tietê - Santana',
            distanceKm: 2.9,
            fareAmount: Math.round((5.5 + 2.9 * 3.2) * 100) / 100,
            status: 'FINALIZADA',
            startedAt: new Date(agora - 1 * dia - 7 * hora),
            endedAt: new Date(agora - 1 * dia - 7 * hora + 13 * 60000),
          },
          {
            driverId: lucasId,
            origin: 'Largo da Matriz - Nossa Sra. do Ó',
            destination: 'Metrô Carandiru - Carandiru',
            distanceKm: 4.2,
            fareAmount: Math.round((5.5 + 4.2 * 3.2) * 100) / 100,
            status: 'CANCELADA',
            startedAt: new Date(agora - 1 * dia - 12 * hora),
            endedAt: new Date(agora - 1 * dia - 12 * hora + 8 * 60000),
          },
        ];

        for (const corrida of corridas) {
          await db.trip.create({ data: corrida });
        }
      }
    }

    return NextResponse.json({
      message: 'Seed concluído com sucesso!',
      credentials: {
        admin: { email: adminEmail, password: 'admin123' },
        motorista: { email: 'motorista@taxicontrol.com', password: 'motorista123' },
      },
      drivers: driversData.map((d) => ({
        nome: d.name,
        email: d.email,
        senha: d.password,
        placa: d.licensePlate,
      })),
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Erro no seed' }, { status: 500 });
  }
}
