import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Synca — Collaborative Workspace Platform',
  description: 'Unified project management, real-time messaging, and file sharing platform for teams.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#f4f4f5] text-zinc-900">
        {children}
      </body>
    </html>
  );
}
