import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
    // 1. Update the session (refresh tokens, etc)
    const { user, response } = await updateSession(request);

    // 2. Define public and auth routes
    const publicRoutes = ['/login', '/auth/callback'];
    const authRoutes = ['/login'];
    const pathname = request.nextUrl.pathname;

    // 3. Redirect authenticated users away from auth routes (login)
    //    If user is logged in and trying to access /login, send them to /dashboard
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    // 4. Redirect unauthenticated users to /login
    //    If the user is NOT logged in AND trying to access a protected route
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
    if (!user && !isPublicRoute) {
        // Redirect to /login
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
