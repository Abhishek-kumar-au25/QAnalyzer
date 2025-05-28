
import DynamicSuggestionsLoader from "@/components/feature/suggestions/dynamic-suggestions-loader";
import { Lightbulb } from "lucide-react";

export default function SuggestionsPage() {
  return (
    <div className="container mx-auto py-8">
      <DynamicSuggestionsLoader />
    </div>
  );
}
