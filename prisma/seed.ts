import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar admin
  const adminEmail = 'admin@taxicontrol.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMINISTRADOR',
        phone: '(11) 99999-0000',
      },
    });
    console.log('✅ Admin criado: admin@taxicontrol.com / admin123');
  } else {
    console.log('⏭️ Admin já existe');
  }

  // Criar motorista demo
  const driverEmail = 'motorista@taxicontrol.com';
  const existingDriver = await prisma.user.findUnique({ where: { email: driverEmail } });

  if (!existingDriver) {
    const hashedPassword = await bcrypt.hash('motorista123', 12);
    await prisma.user.create({
      data: {
        name: 'João Silva',
        email: driverEmail,
        password: hashedPassword,
        role: 'MOTORISTA',
        phone: '(11) 98888-1111',
        licensePlate: 'ABC-1234',
      },
    });
    console.log('✅ Motorista criado: motorista@taxicontrol.com / motorista123');
  } else {
    console.log('⏭️ Motorista já existe');
  }

  // Criar settings
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: { flagRate: 5.5, pricePerKm: 3.2 },
    });
    console.log('✅ Configurações criadas: Bandeirada R$5.50, Km R$3.20');
  } else {
    console.log('⏭️ Configurações já existem');
  }

  // Criar corridas de exemplo
  const driver = await prisma.user.findUnique({ where: { email: driverEmail } });
  if (driver) {
    const tripCount = await prisma.trip.count({ where: { driverId: driver.id } });
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
        await prisma.trip.create({ data: trip });
      }
      console.log(`✅ ${sampleTrips.length} corridas de exemplo criadas`);
    } else {
      console.log('⏭️ Corridas de exemplo já existem');
    }
  }

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
