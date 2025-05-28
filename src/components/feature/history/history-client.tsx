
'use client';

import React, { useMemo } from 'react';
import { useHistory } from '@/contexts/HistoryContext';
import type { HistoryEntry } from '@/types/history';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Trash2, Undo2, FileText, Bug } from 'lucide-react';
import { format, differenceInDays, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const THIRTY_DAYS_AGO = subDays(new Date(), 30);

export default function HistoryClient() {
  const { historyItems, restoreFromHistory, clearHistory } = useHistory();

  const filteredHistory = useMemo(() => {
    return historyItems.filter(item => item.deletedAt >= THIRTY_DAYS_AGO);
  }, [historyItems]);

  const testCasesHistory = useMemo(() => {
    return filteredHistory.filter(item => item.itemType === 'testCase');
  }, [filteredHistory]);

  const defectCasesHistory = useMemo(() => {
    return filteredHistory.filter(item => item.itemType === 'defectCase');
  }, [filteredHistory]);

  const renderHistoryList = (items: HistoryEntry[], itemTypeLabel: string) => {
    if (items.length === 0) {
      return (
        <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg min-h-[200px] flex flex-col justify-center items-center">
          <History className="mx-auto h-12 w-12 mb-4" />
          <p>No {itemTypeLabel.toLowerCase()} in history from the last 30 days.</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[calc(100vh-28rem)]">
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={`${item.itemType}-${item.id}`} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      {item.itemType === 'testCase' ? <FileText className="h-4 w-4 text-primary" /> : <Bug className="h-4 w-4 text-destructive" />}
                      <span className="font-semibold text-sm text-foreground">{item.title}</span>
                      <Badge variant="outline" className="text-xs">{item.id}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Deleted: {format(item.deletedAt, 'PPpp')}
                    </p>
                     {/* Display a snippet of data - customize as needed */}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        Details: {JSON.stringify(item.data).substring(0, 100)}...
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreFromHistory(item.id, item.itemType)}
                    className="flex-shrink-0"
                  >
                    <Undo2 className="mr-2 h-4 w-4" /> Restore
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-primary flex items-center">
            <History className="mr-2 h-5 w-5 text-accent" /> Action History
          </CardTitle>
          <CardDescription>View and restore recently deleted items (last 30 days).</CardDescription>
        </div>
        {filteredHistory.length > 0 && (
             <Button variant="destructive" size="sm" onClick={() => clearHistory()}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Displayed History
             </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({filteredHistory.length})</TabsTrigger>
            <TabsTrigger value="testCases">Test Cases ({testCasesHistory.length})</TabsTrigger>
            <TabsTrigger value="defectCases">Defect Cases ({defectCasesHistory.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {renderHistoryList(filteredHistory, 'Items')}
          </TabsContent>
          <TabsContent value="testCases" className="mt-4">
            {renderHistoryList(testCasesHistory, 'Test Cases')}
          </TabsContent>
          <TabsContent value="defectCases" className="mt-4">
            {renderHistoryList(defectCasesHistory, 'Defect Cases')}
          </TabsContent>
        </Tabs>
         {historyItems.length > filteredHistory.length && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
                Note: Items older than 30 days are not shown but might still be in the history data. True data pruning is not implemented for this in-memory version.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
