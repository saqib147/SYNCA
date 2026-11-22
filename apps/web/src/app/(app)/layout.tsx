import { Sidebar } from '@/components/layout/Sidebar';
import { SocketProvider } from '@/context/SocketContext';
import { ChatNotificationProvider } from '@/context/ChatNotificationContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocketProvider>
      <ChatNotificationProvider>
        <div className="flex min-h-screen bg-[#f3f3f3] dark:bg-transparent p-4 gap-6 transition-colors duration-150">
          {/* Dark Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 py-2 pr-2 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </ChatNotificationProvider>
    </SocketProvider>
  );
}
