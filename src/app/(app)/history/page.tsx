
import DynamicHistoryLoader from '@/components/feature/history/dynamic-history-loader';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Action History - QAnalyzer',
  description: 'View and manage recently deleted items.',
};

export default function HistoryPage() {
  return (
    <div className="container mx-auto py-8">
      <DynamicHistoryLoader />
    </div>
  );
}
