import { NextResponse } from 'next/server';
import { checkWrite, errorResponse, fail } from '@/lib/academic';
import { resetPassword } from '@/lib/account-access';
import { limitAccountWrite } from '@/lib/auth-rate-limit';
export async function POST(request: Request) {
  try {
    checkWrite(request); limitAccountWrite(request, 'reset-password');
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Form reset tidak valid.', 400);
    await resetPassword(input);
    const response = NextResponse.json({ success: true, message: 'Password diperbarui. Silakan masuk dengan password baru.' });
    response.cookies.set('sia_session_token', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' });
    return response;
  } catch (e) { return errorResponse(e); }
}
