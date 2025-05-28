
import DynamicAccessibilityTesterLoader from '@/components/feature/accessibility-testing/dynamic-accessibility-tester-loader';
import { Accessibility } from 'lucide-react';

export default function AccessibilityTestingPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <DynamicAccessibilityTesterLoader />
    </div>
  );
}
