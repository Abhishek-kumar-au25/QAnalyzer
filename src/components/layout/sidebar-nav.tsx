
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/config/nav';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import * as Icons from 'lucide-react'; // Import all icons from lucide-react

interface SidebarNavProps {
  items: NavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  if (!items?.length) {
    return null;
  }

  // Determine default open accordion items based on active sub-item path
  const defaultOpenValues = items
    .map((item, index) => (item.items?.some(subItem => pathname.startsWith(subItem.href)) ? `item-${index}` : null))
    .filter(value => value !== null) as string[];


  return (
    <nav className="grid items-start gap-2">
      <Accordion type="multiple" className="w-full" defaultValue={defaultOpenValues}>
      {items.map((item, index) => {
        // Dynamically get the icon component using the name string
        const IconComponent = Icons[item.iconName as keyof typeof Icons] || Icons.HelpCircle; // Fallback icon
        const isActive = item.href === pathname || (item.href !== '/' && pathname.startsWith(item.href + '/'));

        if (item.items && item.items.length > 0) {
          const isParentActive = item.items.some(subItem => pathname.startsWith(subItem.href));
          return (
            <AccordionItem value={`item-${index}`} key={index} className="border-none">
              <AccordionTrigger
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2",
                  isParentActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground",
                  // Remove default padding from trigger when used in sidebar nav
                  "py-0 hover:no-underline",
                  // Ensure consistent height and padding with SidebarMenuButton
                  "h-10 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:p-2",
                  // Hide the default chevron from AccordionTrigger primitive when sidebar is collapsed
                  "[&>svg:last-child]:group-data-[collapsible=icon]:hidden"
                )}
                 // Disable accordion behavior when collapsed (acts like a button)
                 disabled={typeof window !== 'undefined' && window.document.documentElement.dataset.collapsible === 'icon'}
                 tooltip={{ children: item.title, side: 'right', align: 'center' }}
              >
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
                  <IconComponent className="h-5 w-5" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                </div>
                {/* ChevronDown is automatically added by AccordionTrigger primitive, targeted above */}
              </AccordionTrigger>
              <AccordionContent className="pl-4 pt-1 pb-0 group-data-[collapsible=icon]:hidden"> {/* Hide content when collapsed */}
                <SidebarMenu>
                  {item.items.map((subItem, subIndex) => {
                    // Dynamically get sub-item icon component
                    const SubIconComponent = Icons[subItem.iconName as keyof typeof Icons] || Icons.HelpCircle; // Fallback icon
                    const isSubActive = subItem.href === pathname || (subItem.href !== '/' && pathname.startsWith(subItem.href + '/'));
                    return (
                      <SidebarMenuItem key={subIndex}>
                        <Link href={subItem.disabled ? '#' : subItem.href} legacyBehavior passHref>
                          <SidebarMenuButton
                            asChild
                            variant="default"
                            size="default"
                            className={cn(
                              "w-full justify-start gap-3 h-9", // Ensure consistent height
                              isSubActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "hover:bg-sidebar-accent/80",
                              subItem.disabled && "cursor-not-allowed opacity-80"
                            )}
                            isActive={isSubActive}
                            // No tooltip needed for sub-items as they are hidden when collapsed
                          >
                            <a>
                              <SubIconComponent className="h-4 w-4" />
                              <span className="truncate">{subItem.title}</span>
                            </a>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </AccordionContent>
            </AccordionItem>
          );
        }

        // Non-accordion item
        return (
          <Link href={item.disabled ? '#' : item.href} key={index} legacyBehavior passHref>
            <SidebarMenuButton
              asChild
              variant="default"
              size="default"
              className={cn(
                "w-full justify-start gap-3 h-10", // Ensure consistent height
                isActive ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                item.disabled && "cursor-not-allowed opacity-80"
              )}
              isActive={isActive}
              tooltip={{ children: item.title, side: 'right', align: 'center' }}
            >
              <a>
                <IconComponent className="h-5 w-5" />
                <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
              </a>
            </SidebarMenuButton>
          </Link>
        );
      })}
      </Accordion>
    </nav>
  );
}
