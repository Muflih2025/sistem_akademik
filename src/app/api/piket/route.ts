import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal');

    let query = 'SELECT * FROM piket_log WHERE 1=1';
    const params: any[] = [];

    if (tanggal) {
      query += ' AND tanggal = ?';
      params.push(tanggal);
    }

    query += ' ORDER BY tanggal DESC, id DESC';
    const rows = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
