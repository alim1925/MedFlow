import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'medflow-fallback-secret-key-32-chars-min!!'
);
const COOKIE_NAME = 'medflow_session';

const ROLE_DASHBOARDS = {
  ADMIN: '/admin/dashboard',
  DOCTOR: '/doctor/dashboard',
  PATIENT: '/patient/dashboard',
};

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let session = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      session = payload;
    } catch (err) {
      // Invalid or expired token
      session = null;
    }
  }

  // 1. Redirect authenticated users away from auth pages to their dashboard
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password';
  if (isAuthRoute && session?.role) {
    const destination = ROLE_DASHBOARDS[session.role] || '/';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 2. Role-Based Access Control (RBAC) Route Protection
  const isPatientRoute = pathname === '/patient' || pathname.startsWith('/patient/');
  const isDoctorRoute = pathname === '/doctor' || pathname.startsWith('/doctor/');
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isSharedMedicalRecordRoute =
    pathname === '/medical-records' || pathname.startsWith('/medical-records/');

  if (isPatientRoute || isDoctorRoute || isAdminRoute || isSharedMedicalRecordRoute) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role verification
    if (isPatientRoute && session.role !== 'PATIENT') {
      const targetDashboard = ROLE_DASHBOARDS[session.role] || '/login';
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }

    if (isDoctorRoute && session.role !== 'DOCTOR') {
      const targetDashboard = ROLE_DASHBOARDS[session.role] || '/login';
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }

    if (isAdminRoute && session.role !== 'ADMIN') {
      const targetDashboard = ROLE_DASHBOARDS[session.role] || '/login';
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
  }

  // 3. Set custom headers for downstream Server Components & Route Handlers
  const requestHeaders = new Headers(request.headers);
  if (session) {
    requestHeaders.set('x-user-id', session.id || '');
    requestHeaders.set('x-user-role', session.role || '');
    if (session.patientId) requestHeaders.set('x-patient-id', session.patientId);
    if (session.doctorId) requestHeaders.set('x-doctor-id', session.doctorId);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (session) {
    response.headers.set('x-user-id', session.id || '');
    response.headers.set('x-user-role', session.role || '');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
