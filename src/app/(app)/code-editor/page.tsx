
import DynamicCodeEditorLoader from "@/components/feature/code-editor/dynamic-code-editor-loader";
import { FileCode } from "lucide-react"; // Icon for Code Editor

export default function CodeEditorPage() {
  return (
    <div className="container mx-auto py-8">
      <DynamicCodeEditorLoader />
    </div>
  );
}
