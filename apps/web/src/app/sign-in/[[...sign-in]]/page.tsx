import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
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
