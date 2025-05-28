
import DynamicGanttReportLoader from "@/components/feature/gantt-report-generator/dynamic-gantt-report-loader";
import { TableIcon } from "lucide-react";

export default function GanttReportGeneratorPage() {
  return (
    <div className="container mx-auto py-8">
      <DynamicGanttReportLoader />
    </div>
  );
}
