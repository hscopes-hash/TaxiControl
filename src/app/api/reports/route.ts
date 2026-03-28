import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Financial report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { status: 'FINALIZADA' };
    if (driverId) where.driverId = driverId;
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
    });

    const totalFare = trips.reduce((sum, t) => sum + t.fareAmount, 0);
    const totalDistance = trips.reduce((sum, t) => sum + t.distanceKm, 0);
    const totalTrips = trips.length;

    // Group by driver
    const byDriver: Record<string, {
      driverId: string;
      driverName: string;
      licensePlate: string;
      totalFare: number;
      totalDistance: number;
      tripCount: number;
      trips: typeof trips;
    }> = {};

    for (const trip of trips) {
      const key = trip.driverId;
      if (!byDriver[key]) {
        byDriver[key] = {
          driverId: trip.driverId,
          driverName: trip.driver.name,
          licensePlate: trip.driver.licensePlate || 'N/A',
          totalFare: 0,
          totalDistance: 0,
          tripCount: 0,
          trips: [],
        };
      }
      byDriver[key].totalFare += trip.fareAmount;
      byDriver[key].totalDistance += trip.distanceKm;
      byDriver[key].tripCount += 1;
      byDriver[key].trips.push(trip);
    }

    // Get settings for pricing info
    let settings = await db.settings.findFirst();
    if (!settings) {
      settings = { id: '', flagRate: 5.5, pricePerKm: 3.2, createdAt: new Date(), updatedAt: new Date() };
    }

    return NextResponse.json({
      summary: {
        totalFare: Math.round(totalFare * 100) / 100,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalTrips,
        avgFare: totalTrips > 0 ? Math.round((totalFare / totalTrips) * 100) / 100 : 0,
      },
      settings: {
        flagRate: settings.flagRate,
        pricePerKm: settings.pricePerKm,
      },
      byDriver: Object.values(byDriver),
      trips,
    });
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
