import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const username = searchParams.get('username');

    let query = 'SELECT id, username, nama, role, nip_nis, kelas, is_active FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (username) {
      query += ' AND username = ?';
      params.push(username);
    }

    query += ' ORDER BY role, nama ASC';
    const rows = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
