
import DynamicAudioAnalyzerLoader from "@/components/feature/audio-analyzer/dynamic-audio-analyzer-loader";
import { AudioWaveform } from "lucide-react";

export default function AudioAnalyzerPage() {
  return (
    <div className="container mx-auto py-8">
      <DynamicAudioAnalyzerLoader />
    </div>
  );
}
