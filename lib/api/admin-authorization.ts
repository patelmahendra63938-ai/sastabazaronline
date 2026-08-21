import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';

export async function requireAdminApiSession() {
  const session = await getAdminSession();

  if (!session.user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      ),
    };
  }

  if (!session.authorized) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, error: 'Admin access required.' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true as const,
    user: session.user,
    role: session.role,
  };
}
