// src/app/page.tsx
'use client'; // Make this a client component to use hooks

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        redirect('/dashboard');
      } else {
        redirect('/login');
      }
    }
  }, [user, loading]);

  // Show loading indicator while checking auth status
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
