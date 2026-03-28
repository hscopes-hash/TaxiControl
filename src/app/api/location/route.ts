import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Upsert driver location
export async function POST(request: NextRequest) {
  try {
    const { driverId, latitude, longitude } = await request.json();

    if (!driverId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'driverId, latitude e longitude são obrigatórios' },
        { status: 400 }
      );
    }

    // Delete old location for this driver
    await db.location.deleteMany({ where: { driverId } });

    // Create new location
    const location = await db.location.create({
      data: { driverId, latitude, longitude },
      include: {
        driver: {
          select: { id: true, name: true, licensePlate: true },
        },
      },
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error('Location POST error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET - Get active driver locations (updated in last 3 minutes)
export async function GET() {
  try {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const locations = await db.location.findMany({
      where: {
        updatedAt: { gte: threeMinutesAgo },
      },
      include: {
        driver: {
          select: { id: true, name: true, licensePlate: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Location GET error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
