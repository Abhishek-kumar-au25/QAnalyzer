
import DynamicSprintTimelineLoader from "@/components/feature/sprint-timeline/dynamic-sprint-timeline-loader";
import { CalendarRange } from "lucide-react";

export default function SprintTimelinePage() {
  return (
    <div className="container mx-auto py-8">
      <DynamicSprintTimelineLoader />
    </div>
  );
}
