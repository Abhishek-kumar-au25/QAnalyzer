
'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const SeoTesterClient = dynamic(
  () => import('@/components/feature/seo-testing/seo-tester-client'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-8 min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>Loading SEO Analyzer...</p>
      </div>
    ),
  }
);

export default function DynamicSeoTesterLoader() {
  return <SeoTesterClient />;
}
