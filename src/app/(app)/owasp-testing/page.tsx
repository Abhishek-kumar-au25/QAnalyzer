
import DynamicOwaspTesterLoader from '@/components/feature/owasp-testing/dynamic-owasp-tester-loader';
import { ShieldAlert } from 'lucide-react'; // Icon for OWASP/Security

export default function OwaspTestingPage() {
  return (
    <div className="container mx-auto py-8">
      <DynamicOwaspTesterLoader />
    </div>
  );
}
