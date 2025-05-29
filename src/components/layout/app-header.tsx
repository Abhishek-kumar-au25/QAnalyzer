// src/components/layout/app-header.tsx
'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserProfile } from '@/components/layout/user-profile';
import { navItems, type NavItem } from '@/config/nav';
import { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bell, Settings, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import NetworkConditionsDropdown from '@/components/feature/network-conditions/network-conditions-dropdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// Helper function to find the current nav item and its parent
const findCurrentNav = (pathname: string, items: NavItem[]): { current?: NavItem, parent?: NavItem } => {
  for (const item of items) {
    if (item.href === pathname) {
      return { current: item };
    }
    if (item.items) {
      for (const subItem of item.items) {
        if (pathname.startsWith(subItem.href)) {
          return { current: subItem, parent: item };
        }
      }
    }
  }
  if (pathname === '/dashboard') {
     const dashboardItem = items.find(item => item.href === '/dashboard');
     if (dashboardItem) return { current: dashboardItem };
  }
  return {};
};

// Mock notifications
interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  icon?: React.ElementType;
}

const initialNotifications: Notification[] = [
  { id: '1', title: 'New Defect Assigned', description: 'DEF-001: Login button unresponsive on mobile.', timestamp: '02:04 PM - May 9', read: false, icon: Settings },
  { id: '2', title: 'New Message Received', description: 'You have a new message from John Doe.', timestamp: '01:59 PM - May 9', read: false, icon: Settings },
  { id: '3', title: 'API Test Failed', description: 'The /users endpoint test failed with status 500.', timestamp: '01:34 PM - May 9', read: false, icon: Settings },
  { id: '4', title: 'Sprint Alpha Completed', description: 'Sprint Alpha has been successfully completed.', timestamp: '12:04 PM - May 9', read: true, icon: Settings },
  { id: '5', title: 'Profile Update Required', description: 'Please update your security settings.', timestamp: '02:04 PM - May 8', read: true, icon: Settings },
];


export function AppHeader() {
  const pathname = usePathname();
  const [title, setTitle] = useState('Dashboard');
  const [parentTitle, setParentTitle] = useState<string | null>(null);
  const [parentHref, setParentHref] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [showAllNotificationsModal, setShowAllNotificationsModal] = useState(false);
  const { toast } = useToast();


  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({ title: "Notifications Updated", description: "All notifications marked as read." });
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast({ title: "Notification Cleared" });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    toast({ title: "All Notifications Cleared" });
  };


  useEffect(() => {
    const { current, parent } = findCurrentNav(pathname, navItems);
    setTitle(current?.title ?? 'QAnalyzer');
    setParentTitle(parent?.title ?? null);
    setParentHref(parent?.href ?? null);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-header-background px-4 md:px-6 shadow-sm text-sidebar-foreground">
        <SidebarTrigger className="text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" />
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
             {parentTitle && parentHref && (
               <>
                 <BreadcrumbItem>
                   <BreadcrumbLink asChild>
                      <Link href={parentHref} className="text-sidebar-foreground/80 hover:text-sidebar-foreground">{parentTitle}</Link>
                   </BreadcrumbLink>
                 </BreadcrumbItem>
                 <BreadcrumbSeparator className="text-sidebar-foreground/50" />
               </>
             )}
             <BreadcrumbItem>
               <BreadcrumbPage className="font-semibold text-sidebar-foreground">{title}</BreadcrumbPage>
             </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-1 items-center justify-end gap-2">
          <NetworkConditionsDropdown />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon" className="relative text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent">
                  <Bell className="h-[1.2rem] w-[1.2rem]" />
                  {unreadCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                  )}
                  <span className="sr-only">View notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 md:w-96 bg-popover text-popover-foreground border-border shadow-xl">
              <DropdownMenuLabel className="flex justify-between items-center px-3 py-2">
                <span className="font-semibold">Notifications</span>
                {notifications.length > 0 && (
                   <Button variant="link" size="sm" className="text-xs h-auto p-0 text-primary" onClick={markAllAsRead} disabled={unreadCount === 0}>
                      Mark all as read
                   </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <ScrollArea className="h-[300px]">
                {notifications.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-10">
                    No new notifications.
                  </div>
                ) : (
                  notifications.map(notification => {
                    const Icon = notification.icon || Bell;
                    return(
                      <DropdownMenuItem key={notification.id} onSelect={(e) => { e.preventDefault(); markAsRead(notification.id);}} className={`group flex items-start gap-3 p-3 cursor-pointer hover:bg-accent/10 data-[highlighted]:bg-accent/10 ${notification.read ? 'opacity-70' : ''}`}>
                        <Icon className={`h-5 w-5 mt-0.5 ${notification.read ? 'text-muted-foreground' : 'text-accent'}`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.description}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{notification.timestamp}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={(e) => {e.stopPropagation(); clearNotification(notification.id);}}>
                          <Trash2 className="h-3.5 w-3.5"/>
                        </Button>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </ScrollArea>
              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className="justify-center p-2 cursor-pointer hover:bg-accent/10 data-[highlighted]:bg-accent/10" onSelect={(e) => { e.preventDefault(); setShowAllNotificationsModal(true); }}>
                     <Button variant="link" className="text-sm w-full">View All Notifications</Button>
                  </DropdownMenuItem>
                   <DropdownMenuItem className="justify-center p-2 cursor-pointer hover:bg-destructive/10 data-[highlighted]:bg-destructive/10" onSelect={(e) => {e.preventDefault(); clearAllNotifications();}}>
                     <Button variant="link" className="text-sm w-full text-destructive hover:text-destructive/80">Clear All Notifications</Button>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
          <UserProfile />
        </div>
      </header>

      <Dialog open={showAllNotificationsModal} onOpenChange={setShowAllNotificationsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>All Notifications</DialogTitle>
            <DialogDescription>
              Showing all current notifications. Auto-deletion after 1 week requires backend integration.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No notifications to display.</p>
            ) : (
              <div className="space-y-3 py-2">
                {notifications.map(notification => {
                  const Icon = notification.icon || Bell;
                  return (
                    <div key={`modal-${notification.id}`} className={`flex items-start gap-3 p-3 border rounded-lg ${notification.read ? 'opacity-70 bg-muted/50' : 'bg-background'}`}>
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${notification.read ? 'text-muted-foreground' : 'text-accent'}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.description}</p>
                        <p className="text-xs text-muted-foreground/80 mt-0.5">{notification.timestamp}</p>
                      </div>
                       {!notification.read && (
                         <Button variant="ghost" size="sm" className="text-xs h-auto py-1 px-2 text-primary" onClick={() => markAsRead(notification.id)}>
                            Mark as Read
                         </Button>
                       )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
