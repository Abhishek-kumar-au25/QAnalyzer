
// src/app/(app)/layout.tsx
'use client'; // Mark as client component because we use hooks

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
} from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { navItems } from '@/config/nav';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { redirect, usePathname } from 'next/navigation'; // useRouter not needed for this specific loader logic
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HistoryProvider } from '@/contexts/HistoryContext';
import PageLoader from '@/components/layout/page-loader'; // Import the PageLoader
import { NetworkConditionsProvider } from '@/contexts/NetworkConditionsContext'; // Import the new provider

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();

  const [isClient, setIsClient] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false); // State for page loader

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !authLoading && !user && pathname !== '/login' && pathname !== '/signup') {
      redirect('/login');
    }
  }, [user, authLoading, pathname, isClient]);

  // Page loading effect
  useEffect(() => {
    let timer: NodeJS.Timeout;

    // When the pathname changes, it means navigation has occurred or is occurring.
    // Show the loader immediately.
    if (isClient) { // Only run page loader logic on the client
        setIsPageLoading(true);

        // Set a timer to hide the loader. This ensures it's visible for a minimum duration.
        // If the new page content renders faster than this, the loader still shows briefly.
        timer = setTimeout(() => {
          setIsPageLoading(false);
        }, 700); // Increased from 300ms to 700ms
    }


    // Cleanup function:
    // This runs when the component unmounts or when 'pathname' changes again (before the next effect runs).
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pathname, isClient]); // Re-run this effect ONLY when the pathname changes or isClient updates.


  if (!isClient || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && pathname !== '/login' && pathname !== '/signup') {
    // This case should ideally be handled by the redirect effect,
    // but returning null prevents rendering the layout for unauthed users on protected routes.
    return null;
  }

  return (
    <NetworkConditionsProvider> {/* Wrap with NetworkConditionsProvider */}
      <HistoryProvider>
        <TooltipProvider delayDuration={0}>
          <SidebarProvider defaultOpen={true}>
            <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border">
              <SidebarHeader className="p-4">
                <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-sidebar-primary">
                    {/* Updated QAnalyzer Icon */}
                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                    <path d="M7 12h10"/>
                    <path d="M12 7v10"/>
                  </svg>
                  <span className="text-2xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">QAnalyzer</span>
                </Link>
              </SidebarHeader>
              <SidebarContent className="p-2">
                <ScrollArea className="h-[calc(100vh-8rem)]"> {/* Adjusted height for potential footer */}
                  <SidebarNav items={navItems} />
                </ScrollArea>
              </SidebarContent>
              {/* SidebarFooter can be added here if needed */}
            </Sidebar>
            <SidebarInset>
              <AppHeader />
              <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-background">
                {isPageLoading && <PageLoader />} {/* Conditionally render PageLoader */}
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </HistoryProvider>
    </NetworkConditionsProvider>
  );
}
