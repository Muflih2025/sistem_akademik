import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bulan = searchParams.get('bulan');

    let query = 'SELECT * FROM ak_kalender WHERE 1=1';
    const params: any[] = [];

    // Jika bukan admin, hanya tampilkan agenda yang disahkan (sesuai test.md: draft tidak dianggap resmi)
    if (user.role !== 'admin') {
      query += " AND status = 'disahkan'";
    }

    query += ' ORDER BY mulai ASC';
    const rows = db.prepare(query).all(...params);

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
