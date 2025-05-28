
'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const TestCaseGeneratorClient = dynamic(
  () => import('@/components/feature/test-case-generator/test-case-generator-client'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-8 min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>Loading Test Case Generator...</p>
      </div>
    ),
  }
);

export default function DynamicTestCaseGeneratorLoader() {
  return <TestCaseGeneratorClient />;
}
