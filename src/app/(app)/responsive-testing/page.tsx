
import DynamicResponsiveTesterLoader from '@/components/feature/responsive-testing/dynamic-responsive-tester-loader';
import { Smartphone } from 'lucide-react'; // Import an appropriate icon

export default function ResponsiveTestingPage() {
  return (
    <div className="container mx-auto py-8">
      <DynamicResponsiveTesterLoader />
    </div>
  );
}
