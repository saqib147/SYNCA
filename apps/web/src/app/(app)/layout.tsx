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
        <div className="flex h-screen overflow-hidden bg-[#f3f3f3] dark:bg-transparent p-4 gap-5 transition-colors duration-150">
          {/* Dark Sidebar */}
          <Sidebar />

          {/* Main Content Area (viewport-locked; scrolling happens inside each page container) */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {children}
            </main>
          </div>
        </div>
      </ChatNotificationProvider>
    </SocketProvider>
  );
}
