
import DynamicTestCaseManagerLoader from "@/components/feature/test-cases/dynamic-test-case-manager-loader";
import { ClipboardList } from "lucide-react";

export default function TestCasesPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <DynamicTestCaseManagerLoader />
    </div>
  );
}
