import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    // Create admin user if not exists
    const adminEmail = 'admin@taxicontrol.com';
    const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await db.user.create({
        data: {
          name: 'Administrador',
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMINISTRADOR',
          phone: '(11) 99999-0000',
        },
      });
    }

    // Create demo driver if not exists
    const driverEmail = 'motorista@taxicontrol.com';
    const existingDriver = await db.user.findUnique({ where: { email: driverEmail } });

    if (!existingDriver) {
      const hashedPassword = await bcrypt.hash('motorista123', 12);
      await db.user.create({
        data: {
          name: 'João Silva',
          email: driverEmail,
          password: hashedPassword,
          role: 'MOTORISTA',
          phone: '(11) 98888-1111',
          licensePlate: 'ABC-1234',
        },
      });
    }

    // Create settings if not exists
    const existingSettings = await db.settings.findFirst();
    if (!existingSettings) {
      await db.settings.create({
        data: { flagRate: 5.5, pricePerKm: 3.2 },
      });
    }

    // Create sample trips for reports demo
    const driver = await db.user.findUnique({ where: { email: driverEmail } });
    if (driver) {
      const tripCount = await db.trip.count({ where: { driverId: driver.id } });
      if (tripCount === 0) {
        const sampleTrips = [
          {
            driverId: driver.id,
            origin: 'Av. Paulista, 1000 - São Paulo, SP',
            destination: 'Rua Augusta, 500 - São Paulo, SP',
            distanceKm: 3.2,
            fareAmount: 5.5 + 3.2 * 3.2,
            status: 'FINALIZADA',
            startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            endedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
          },
          {
            driverId: driver.id,
            origin: 'Praça da Sé - São Paulo, SP',
            destination: 'Shopping Morumbi - São Paulo, SP',
            distanceKm: 12.5,
            fareAmount: 5.5 + 12.5 * 3.2,
            status: 'FINALIZADA',
            startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
          },
          {
            driverId: driver.id,
            origin: 'Aeroporto de Guarulhos - SP',
            destination: 'Av. Brigadeiro Faria Lima, 1000 - SP',
            distanceKm: 25.8,
            fareAmount: 5.5 + 25.8 * 3.2,
            status: 'FINALIZADA',
            startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          },
          {
            driverId: driver.id,
            origin: 'Rua Oscar Freire, 900 - São Paulo, SP',
            destination: 'Terminal Rodoviário Tietê - SP',
            distanceKm: 8.1,
            fareAmount: 5.5 + 8.1 * 3.2,
            status: 'FINALIZADA',
            startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            endedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          },
          {
            driverId: driver.id,
            origin: 'Pinheiros - São Paulo, SP',
            destination: 'Moema - São Paulo, SP',
            distanceKm: 6.7,
            fareAmount: 5.5 + 6.7 * 3.2,
            status: 'FINALIZADA',
            startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
            endedAt: new Date(Date.now() - 12 * 60 * 60 * 1000 + 22 * 60 * 1000),
          },
        ];

        for (const trip of sampleTrips) {
          await db.trip.create({ data: trip });
        }
      }
    }

    return NextResponse.json({
      message: 'Seed concluído com sucesso!',
      credentials: {
        admin: { email: adminEmail, password: 'admin123' },
        motorista: { email: driverEmail, password: 'motorista123' },
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Erro no seed' }, { status: 500 });
  }
}
