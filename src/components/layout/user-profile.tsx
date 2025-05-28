// src/components/layout/user-profile.tsx
"use client"

import * as React from "react"
import {
  LogOut,
  User,
  Settings,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"; // Import Link for settings

export function UserProfile() {
  const { user, signOut, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed", error);
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!user) {
    return null;
  }

  const getInitials = (email?: string | null, displayName?: string | null) => {
     if (displayName) {
        const names = displayName.split(' ');
        if (names.length > 1) {
            return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        }
        return displayName.substring(0, 2).toUpperCase();
     }
     if (!email) return '??';
     const parts = email.split('@')[0].split(/[\s._-]+/);
     if (parts.length === 1) {
         return parts[0].substring(0, 2).toUpperCase();
     }
     return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
  }

  const initials = getInitials(user.email, user.displayName);
  const avatarSrc = user.photoURL || undefined; 

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarSrc} alt={user.displayName || user.email || 'User'} data-ai-hint="person avatar" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || user.email?.split('@')[0] || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
             <Link href="/settings">
                <span className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </span>
             </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
             <Link href="/settings">
                <span className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </span>
             </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
