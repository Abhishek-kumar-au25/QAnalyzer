
'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the original page component itself
const CrossBrowserTestingPageComponent = dynamic(
  () => import('@/app/(app)/cross-browser-testing/page'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-8 min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>Loading Cross Browser Tester...</p>
      </div>
    ),
  }
);

export default function DynamicCrossBrowserPageLoader() {
  return <CrossBrowserTestingPageComponent />;
}
