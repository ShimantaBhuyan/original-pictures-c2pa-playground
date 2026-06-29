import { NextResponse } from 'next/server';
import { getAllRecords } from '@/server/services/recordsDb';

export async function GET() {
  try {
    const records = getAllRecords();
    return NextResponse.json(records);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
