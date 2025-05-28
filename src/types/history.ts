
import type { TestCase } from '@/components/feature/test-cases/test-case-manager-client';
import type { DefectCase } from '@/components/feature/defect-cases/defect-case-manager-client';

// Assuming Sprint type is defined in sprint-timeline-client.tsx and exported, or defined here.
// For now, let's define a minimal Sprint interface for history.
interface SprintHistoryItem {
  id: string;
  name: string; // Or whatever property is used as title
  startDate: Date;
  endDate: Date;
  tasks: any[]; // Simplified for history
  title?: string; // Ensure title is present for consistency
}


export type HistoryItemType = 'testCase' | 'defectCase' | 'sprint'; // Added 'sprint'

// Ensure the data property in HistoryEntry can hold the title property
// which might not be explicitly on TestCase or DefectCase if it's derived.
// For simplicity, we'll assume `item.title` exists on the passed object for addToHistory.
export interface HistoryEntry {
  id: string; // Original ID of the item
  itemType: HistoryItemType;
  data: (TestCase | DefectCase | SprintHistoryItem) & { title?: string }; // Ensure title is part of the data if not directly on type
  deletedAt: Date;
  title: string; // A consistent title field for display
}
