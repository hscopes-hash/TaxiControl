import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List trips (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};

    if (driverId) where.driverId = driverId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) (where.startedAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.startedAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const trips = await db.trip.findMany({
      where,
      include: {
        driver: {
          select: { id: true, name: true, licensePlate: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ trips });
  } catch (error) {
    console.error('Trips GET error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Create new trip
export async function POST(request: NextRequest) {
  try {
    const { driverId, origin, destination, distanceKm } = await request.json();

    if (!driverId || !origin || !destination || distanceKm === undefined) {
      return NextResponse.json(
        { error: 'driverId, origin, destination e distanceKm são obrigatórios' },
        { status: 400 }
      );
    }

    // Get current pricing settings
    let settings = await db.settings.findFirst();
    if (!settings) {
      settings = await db.settings.create({
        data: { flagRate: 5.5, pricePerKm: 3.2 },
      });
    }

    const fareAmount = settings.flagRate + (distanceKm * settings.pricePerKm);

    const trip = await db.trip.create({
      data: {
        driverId,
        origin,
        destination,
        distanceKm,
        fareAmount: Math.round(fareAmount * 100) / 100,
        status: 'EM_ANDAMENTO',
      },
      include: {
        driver: {
          select: { id: true, name: true, licensePlate: true },
        },
      },
    });

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    console.error('Trips POST error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Update trip (finalize/cancel)
export async function PUT(request: NextRequest) {
  try {
    const { tripId, status } = await request.json();

    if (!tripId || !status) {
      return NextResponse.json(
        { error: 'tripId e status são obrigatórios' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'FINALIZADA' || status === 'CANCELADA') {
      updateData.endedAt = new Date();
    }

    const trip = await db.trip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        driver: {
          select: { id: true, name: true, licensePlate: true },
        },
      },
    });

    return NextResponse.json({ trip });
  } catch (error) {
    console.error('Trips PUT error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
