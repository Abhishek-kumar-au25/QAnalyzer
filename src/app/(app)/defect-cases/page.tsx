
import DynamicDefectCaseManagerLoader from "@/components/feature/defect-cases/dynamic-defect-case-manager-loader";
import { Bug } from "lucide-react";

export default function DefectCasesPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <DynamicDefectCaseManagerLoader />
    </div>
  );
}
