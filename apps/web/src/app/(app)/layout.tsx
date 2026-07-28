import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f4f4f5] py-6 px-8 gap-8">
      {/* Dark Sidebar */}
      <Sidebar />

      {/* Main Content Area */}

      {/* <TopBar /> */}
      <main className="flex-1  overflow-y-auto">
        {children}
      </main>
    </div>

  );
}
