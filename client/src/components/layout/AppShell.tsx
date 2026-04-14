import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sidebarCollapsed) {
      timerRef.current = setTimeout(() => setSidebarCollapsed(true), 20_000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [sidebarCollapsed]);

  return (
    <div className="flex w-full h-screen bg-gray-50 dark:bg-nord-bg text-gray-900 dark:text-nord-text">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((prev) => !prev)} />
      <main className="flex-1 min-w-0 overflow-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
}
