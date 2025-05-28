
import DynamicApiTesterLoader from '@/components/feature/api-testing/dynamic-api-tester-loader';

export default function ApiTestingPage() {
  return (
    <div className="container mx-auto py-8 space-y-8 h-[calc(100vh-var(--header-height))] flex flex-col">
      {/* Interactive API Tester takes full page */}
      <DynamicApiTesterLoader />
    </div>
  );
}

