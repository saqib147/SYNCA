import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware((auth, request) => {
  const { userId } = auth();

  // If already signed in and hitting /sign-in or /sign-up, redirect straight to /dashboard
  // (avoids Clerk's blank screen when <SignIn/> refuses to render for single-session users)
  if (userId && isPublicRoute(request)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
