
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useState, useContext, useCallback } from 'react';
import type { TestCase } from '@/components/feature/test-cases/test-case-manager-client';
import type { DefectCase } from '@/components/feature/defect-cases/defect-case-manager-client';
import type { HistoryEntry, HistoryItemType } from '@/types/history';
import { useToast } from '@/hooks/use-toast';

// Assuming Sprint type is defined elsewhere, e.g., in sprint-timeline-client.tsx or types/history.ts
// For this context, we only care about the common properties like id and title (or name).
interface GenericHistoryableItem {
  id: string;
  title?: string; // Make title optional as it might come from 'name' for sprints
  name?: string;  // For sprints, 'name' might be the source of the title
  // Add other common properties if needed for history display, or cast specific types in components.
  [key: string]: any; // Allow other properties
}


interface HistoryContextType {
  historyItems: HistoryEntry[];
  addToHistory: (item: GenericHistoryableItem, itemType: HistoryItemType) => void;
  restoreFromHistory: (id: string, itemType: HistoryItemType) => void;
  isItemInHistory: (id: string, itemType: HistoryItemType) => boolean;
  clearHistory: (itemType?: HistoryItemType) => void; // Optional: to clear specific type or all
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
  const { toast } = useToast();

  const getItemTitle = (item: GenericHistoryableItem, itemType: HistoryItemType): string => {
    return item.title || item.name || `${itemType} ${item.id}`;
  };

  const addToHistory = useCallback((item: GenericHistoryableItem, itemType: HistoryItemType) => {
    const title = getItemTitle(item, itemType);
    const newEntry: HistoryEntry = {
      id: item.id,
      itemType,
      data: { ...item, title }, // Ensure title is part of stored data
      deletedAt: new Date(),
      title: title,
    };
    setHistoryItems(prevItems => [newEntry, ...prevItems]);

    let itemTypeLabel = 'Item';
    if (itemType === 'testCase') itemTypeLabel = 'Test Case';
    else if (itemType === 'defectCase') itemTypeLabel = 'Defect Case';
    else if (itemType === 'sprint') itemTypeLabel = 'Sprint';

    toast({ title: `${itemTypeLabel} Moved to History`, description: `"${title}" can be restored from the History section.` });
  }, [toast]);

  const restoreFromHistory = useCallback((id: string, itemType: HistoryItemType) => {
    const itemToRestore = historyItems.find(item => item.id === id && item.itemType === itemType);
    setHistoryItems(prevItems => prevItems.filter(item => !(item.id === id && item.itemType === itemType)));
    if (itemToRestore) {
        let itemTypeLabel = 'Item';
        if (itemType === 'testCase') itemTypeLabel = 'Test Case';
        else if (itemType === 'defectCase') itemTypeLabel = 'Defect Case';
        else if (itemType === 'sprint') itemTypeLabel = 'Sprint';
        toast({ title: `${itemTypeLabel} Restored`, description: `"${itemToRestore.title}" has been restored.` });
    }
  }, [historyItems, toast]);

  const isItemInHistory = useCallback((id: string, itemType: HistoryItemType): boolean => {
    return historyItems.some(item => item.id === id && item.itemType === itemType);
  }, [historyItems]);

  const clearHistory = useCallback((itemType?: HistoryItemType) => {
    if (itemType) {
        setHistoryItems(prev => prev.filter(item => item.itemType !== itemType));
        let itemTypeLabel = 'Items';
        if (itemType === 'testCase') itemTypeLabel = 'Test Cases';
        else if (itemType === 'defectCase') itemTypeLabel = 'Defect Cases';
        else if (itemType === 'sprint') itemTypeLabel = 'Sprints';
        toast({ title: `${itemTypeLabel} History Cleared`});
    } else {
        setHistoryItems([]);
        toast({ title: 'All History Cleared' });
    }
  }, [toast]);


  return (
    <HistoryContext.Provider value={{ historyItems, addToHistory, restoreFromHistory, isItemInHistory, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
