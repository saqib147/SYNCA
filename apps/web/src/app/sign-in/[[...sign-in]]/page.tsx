import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#d8f870', // Lime accent
            colorBackground: '#16191e', // Sidebar dark
            colorText: '#ffffff',
            colorTextSecondary: '#a1a1aa',
            colorInputBackground: '#1e232b',
            colorInputText: '#ffffff',
          },
          elements: {
            card: 'border border-zinc-800/80 shadow-2xl rounded-3xl',
            headerTitle: 'text-white font-extrabold text-2xl',
            headerSubtitle: 'text-zinc-400',
            socialButtonsBlockButton: 'bg-[#1e232b] border-zinc-800 hover:bg-zinc-800 text-white transition-all',
            formButtonPrimary: 'bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-900 font-semibold transition-all',
            footerActionText: 'text-zinc-400',
            footerActionLink: 'text-[#d8f870] hover:text-[#c4ea48]',
            dividerLine: 'bg-zinc-800',
            dividerText: 'text-zinc-500',
            formFieldLabel: 'text-zinc-300',
            formFieldInput: 'border-zinc-800 bg-[#1e232b] focus:border-[#d8f870]',
            identityPreviewText: 'text-zinc-300',
            identityPreviewEditButtonIcon: 'text-zinc-400 hover:text-white',
          },
        }}
      />
    </div>
  );
}
