import { NextResponse } from 'next/server';
import { checkWrite, errorResponse, fail } from '@/lib/academic';
import { registerAccount } from '@/lib/account-access';
import { limitAccountWrite } from '@/lib/auth-rate-limit';
export async function POST(request: Request) {
  try {
    checkWrite(request); limitAccountWrite(request, 'register');
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Form pendaftaran tidak valid.', 400);
    return NextResponse.json({ success: true, ...await registerAccount(input) }, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
