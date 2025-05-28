'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the ApiTesterClient component with SSR disabled
const ApiTesterClient = dynamic(
  () => import('@/components/feature/api-testing/api-tester-client'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>Loading API Tester...</p>
      </div>
    )
  }
);

export default function DynamicApiTesterLoader() {
  return <ApiTesterClient />;
}

