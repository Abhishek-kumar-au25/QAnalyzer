
import type { Metadata } from 'next';
import DynamicTestCaseGeneratorLoader from '@/components/feature/test-case-generator/dynamic-test-case-generator-loader';
import { ClipboardPlus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Test Case Generator',
  description: 'Generate test cases based on feature descriptions or user stories.',
};

export default function TestCaseGeneratorPage() {
  return (
    <div className="container mx-auto py-8">
      <DynamicTestCaseGeneratorLoader />
    </div>
  );
}
