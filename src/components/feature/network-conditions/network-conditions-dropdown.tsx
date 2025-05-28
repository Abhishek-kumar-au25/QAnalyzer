
'use client';

import React from 'react';
import { useNetworkConditions, type NetworkSpeed } from '@/contexts/NetworkConditionsContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wifi, WifiOff, Smartphone, Signal, SignalLow, SignalMedium } from 'lucide-react'; // Added more icons
import { cn } from '@/lib/utils';

const networkSpeedOptions: Array<{ value: NetworkSpeed; label: string; icon: React.ElementType }> = [
  { value: 'online', label: 'Online (Default)', icon: Wifi },
  { value: 'slow-3g', label: 'Slow 3G (Simulated)', icon: SignalLow },
  { value: 'fast-3g', label: 'Fast 3G (Simulated)', icon: SignalMedium },
  { value: 'offline', label: 'Offline (Simulated)', icon: WifiOff },
];

export default function NetworkConditionsDropdown() {
  const { currentSpeed, setNetworkSpeed, isSimulating } = useNetworkConditions();

  const CurrentIcon = networkSpeedOptions.find(opt => opt.value === currentSpeed)?.icon || Wifi;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent", isSimulating && "ring-2 ring-yellow-500")}>
          <CurrentIcon className={cn("h-[1.2rem] w-[1.2rem]", isSimulating && "text-yellow-500")} />
          <span className="sr-only">Network Conditions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover text-popover-foreground border-border shadow-xl">
        <DropdownMenuLabel className="font-semibold">Simulate Network</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border"/>
        {networkSpeedOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setNetworkSpeed(option.value)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              currentSpeed === option.value && "bg-accent text-accent-foreground"
            )}
          >
            <option.icon className="h-4 w-4" />
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-border"/>
        <div className="p-2 text-xs text-muted-foreground">
          Note: This simulates network conditions for testing UI responses. It does not actually throttle your network speed. Use browser DevTools for true network throttling.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
