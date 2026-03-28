import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get settings
export async function GET() {
  try {
    let settings = await db.settings.findFirst();

    if (!settings) {
      settings = await db.settings.create({
        data: { flagRate: 5.5, pricePerKm: 3.2 },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
  try {
    const { flagRate, pricePerKm } = await request.json();

    if (flagRate === undefined || pricePerKm === undefined) {
      return NextResponse.json(
        { error: 'flagRate e pricePerKm são obrigatórios' },
        { status: 400 }
      );
    }

    let settings = await db.settings.findFirst();

    if (!settings) {
      settings = await db.settings.create({
        data: { flagRate: parseFloat(flagRate), pricePerKm: parseFloat(pricePerKm) },
      });
    } else {
      settings = await db.settings.update({
        where: { id: settings.id },
        data: {
          flagRate: parseFloat(flagRate),
          pricePerKm: parseFloat(pricePerKm),
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
