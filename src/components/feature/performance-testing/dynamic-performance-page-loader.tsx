
'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const PerformanceTestingPageClient = dynamic(
  () => import('@/app/(app)/performance-testing/page'), // Assuming the page itself is the client component
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-8 min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>Loading Performance Tester...</p>
      </div>
    ),
  }
);

export default function DynamicPerformancePageLoader() {
  // The dynamic import already returns the default export of the page, which is the component itself.
  return <PerformanceTestingPageClient />;
}
