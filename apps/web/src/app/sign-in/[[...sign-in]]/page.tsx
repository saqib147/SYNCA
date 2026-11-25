'use client';

import { useEffect } from 'react';
import { SignIn, useAuth, useClerk } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Full navigation ensures Next.js middleware receives the freshly synced __session cookie
      window.location.replace('/dashboard');
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#000000] p-4 text-zinc-300">
        <Loader2 className="h-7 w-7 animate-spin text-[#66deb4]" />
        <p className="text-sm">
          {isSignedIn ? 'Already signed in — redirecting to Dashboard…' : 'Loading authentication…'}
        </p>
        {isSignedIn && (
          <div className="mt-2 flex items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-lg bg-[#006c52] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005742] transition-colors"
            >
              Continue to Dashboard
            </a>
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: '/sign-in' })}
              className="rounded-lg border border-white/15 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#000000] p-4">
      <SignIn
        fallbackRedirectUrl="/dashboard"
        appearance={{
          variables: {
            colorPrimary: '#66deb4',
            colorBackground: '#17181c',
            colorText: '#ffffff',
            colorTextSecondary: '#a1a1aa',
            colorInputBackground: '#1e2127',
            colorInputText: '#ffffff',
          },
          elements: {
            card: 'border border-white/[0.08] shadow-2xl rounded-[20px]',
            headerTitle: 'text-white font-extrabold text-2xl',
            headerSubtitle: 'text-zinc-400',
            socialButtonsBlockButton: 'bg-[#1e2127] border-white/[0.08] hover:bg-[#252932] text-white transition-all',
            formButtonPrimary: 'bg-[#006c52] hover:bg-[#005742] text-white font-semibold transition-all',
            footerActionText: 'text-zinc-400',
            footerActionLink: 'text-[#66deb4] hover:text-[#52d1a4]',
            dividerLine: 'bg-white/[0.08]',
            dividerText: 'text-zinc-500',
            formFieldLabel: 'text-zinc-300',
            formFieldInput: 'border-white/[0.1] bg-[#1e2127] focus:border-[#66deb4]',
            identityPreviewText: 'text-zinc-300',
            identityPreviewEditButtonIcon: 'text-zinc-400 hover:text-white',
          },
        }}
      />
    </div>
  );
}
