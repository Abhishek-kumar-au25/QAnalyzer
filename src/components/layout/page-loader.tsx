// src/components/layout/page-loader.tsx
'use client';

import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">Loading page...</p>
      </div>
    </div>
  );
}
