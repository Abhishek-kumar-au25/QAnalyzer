
// 'use client';

// import dynamic from 'next/dynamic';
// import { Loader2 } from 'lucide-react';

// const AccessibilityTesterClient = dynamic(
//   () => import('@/components/feature/accessibility-testing/accessibility-tester-client'),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-8 min-h-[400px]">
//         <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
//         <p>Loading Accessibility Tester...</p>
//       </div>
//     ),
//   }
// );

// export default function DynamicAccessibilityTesterLoader() {
//   return <AccessibilityTesterClient />;
// }

'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Fallback UI for loading state
const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-8 min-h-[400px]">
    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
    <p>Loading Accessibility Tester...</p>
  </div>
);

// Dynamically import the client component with SSR disabled
const AccessibilityTesterClient = dynamic(
  () => import('@/components/feature/accessibility-testing/accessibility-tester-client'),
  {
    ssr: false,
    loading: LoadingFallback,
  }
);

export default function DynamicAccessibilityTesterLoader() {
  return <AccessibilityTesterClient />;
}
