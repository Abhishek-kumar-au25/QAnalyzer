
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import { Accessibility, ScanSearch, Construction, CheckCircle, AlertCircle, Contrast, Info, Fingerprint, Keyboard, CheckSquare, Loader2, Siren, AlertTriangle, Code, ListChecks } from "lucide-react"; // Added ListChecks, AlertTriangle
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox'; // Ensure Checkbox is imported correctly
import { ScrollArea } from '@/components/ui/scroll-area';

// Types for Scan Results
interface AccessibilityFinding {
  id: string;
  severity: 'Error' | 'Warning' | 'Contrast' | 'Info' | 'Feature' | 'Structure' | 'ARIA';
  description: string;
  elementSelector?: string; // Optional CSS selector or XPath
  recommendation: string;
  wcagGuideline?: string; // e.g., "WCAG 1.1.1"
}

interface ScanResults {
  url: string; // Added URL to results
  summary: {
    errors: number;
    warnings: number;
    contrastErrors: number;
    features: number;
    aria: number;
    structure: number;
  };
  findings: AccessibilityFinding[];
  checklistConsidered: boolean; // Flag to indicate if checklist affected results
}

type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';

// Define state type for manual checklist
type ManualChecklistState = {
    [key: string]: boolean;
};

// Define checklist items with details
interface ChecklistItem {
    id: string;
    label: string;
    category: 'Keyboard Navigation' | 'Screen Reader Compatibility'; // Add more categories if needed
    relatedFindingTypes?: AccessibilityFinding['severity'][]; // Which finding types this relates to
}

const checklistItems: ChecklistItem[] = [
    { id: 'kb-focus-visible', label: 'All interactive elements are focusable.', category: 'Keyboard Navigation', relatedFindingTypes: ['Warning', 'Error'] },
    { id: 'kb-focus-order', label: 'Focus order is logical and follows visual flow.', category: 'Keyboard Navigation', relatedFindingTypes: ['Warning', 'Error'] },
    { id: 'kb-trap', label: 'No keyboard traps are present.', category: 'Keyboard Navigation', relatedFindingTypes: ['Error'] },
    { id: 'kb-all-actions', label: 'All actions can be performed using only the keyboard.', category: 'Keyboard Navigation', relatedFindingTypes: ['Error'] },
    { id: 'sr-content', label: 'All content is read out logically by screen reader.', category: 'Screen Reader Compatibility', relatedFindingTypes: ['Warning', 'Error', 'Structure'] },
    { id: 'sr-images', label: 'Images have appropriate alternative text.', category: 'Screen Reader Compatibility', relatedFindingTypes: ['Error'] },
    { id: 'sr-forms', label: 'Form controls are properly labeled and announced.', category: 'Screen Reader Compatibility', relatedFindingTypes: ['Error', 'ARIA'] },
    { id: 'sr-dynamic', label: 'Dynamic content changes are announced (ARIA live regions).', category: 'Screen Reader Compatibility', relatedFindingTypes: ['Warning', 'ARIA'] },
];


// Initial state for the checklist based on checklistItems
const initialChecklistState: ManualChecklistState = checklistItems.reduce((acc, item) => {
    acc[item.id] = false;
    return acc;
}, {} as ManualChecklistState);


// Mock Data Generation - Now accepts checklist state
const generateMockFindings = (checkedItems: string[]): AccessibilityFinding[] => {
  const severities: AccessibilityFinding['severity'][] = ['Error', 'Warning', 'Contrast', 'Info', 'Feature', 'Structure', 'ARIA'];
  const descriptions = [
    "Missing alternative text for image.",
    "Empty button.",
    "Form label missing.",
    "Low contrast text.",
    "Heading level skipped.",
    "Redundant link.",
    "Device-dependent event handler.",
    "Missing ARIA role.",
    "Invalid ARIA attribute value.",
    "Frame missing title.",
    "Deprecated HTML element used.",
    "Orphaned form label.",
    "Focus indicator missing.",
    "Focus order illogical on modal.",
    "ARIA live region missing for dynamic update."
  ];
   const recommendations = [
    "Add descriptive alt text.",
    "Provide text or ARIA label for button.",
    "Associate label with form control.",
    "Increase text contrast.",
    "Ensure heading levels are sequential.",
    "Combine adjacent links.",
    "Use device-independent event handlers.",
    "Add appropriate ARIA role.",
    "Correct ARIA attribute value.",
    "Add descriptive title to frame.",
    "Replace with modern HTML element.",
    "Ensure label is associated with a control.",
    "Ensure a visible focus style for all interactive elements.",
    "Adjust tabindex or DOM order to ensure logical focus flow.",
    "Use aria-live attributes (polite/assertive) for content that updates dynamically."
  ];
  const guidelines = ["1.1.1", "1.3.1", "2.4.4", "1.4.3", "1.3.1", "2.4.9", "2.1.1", "4.1.2", "4.1.2", "2.4.1", "4.1.1", "1.3.1", "2.4.7", "2.4.3", "4.1.3"];
  const selectors = ["img#logo", "button.submit", "input[name='email']", "p.low-contrast", "h3", "a.read-more", "#clickable-div", "div[role='navigation']", "[aria-invalid='true']", "iframe.ad", "font", "label[for='unused']", "a.nav-link", ".modal-dialog", "#dynamic-update-area"];

  const count = Math.floor(Math.random() * 15) + 5; // 5 to 20 findings
  const findings: AccessibilityFinding[] = [];

  // Simulate checklist influence: Reduce likelihood of related errors if item is checked
  const isChecked = (itemId: string) => checkedItems.includes(itemId);
  const getFindingLikelihood = (relatedChecklistIds: string[]): number => {
      // If any related item is checked, reduce the chance of finding an error
      return relatedChecklistIds.some(id => isChecked(id)) ? 0.3 : 1.0; // 30% chance if checked, 100% otherwise
  };

  for (let i = 0; i < count; i++) {
    const severityIndex = Math.floor(Math.random() * severities.length);
    const descIndex = Math.floor(Math.random() * descriptions.length);

    // Example: Link findings to checklist items (adjust indices/logic as needed)
    let relatedCheckIds: string[] = [];
    if (descriptions[descIndex].includes('alternative text')) relatedCheckIds.push('sr-images');
    if (descriptions[descIndex].includes('Form label')) relatedCheckIds.push('sr-forms');
    if (descriptions[descIndex].includes('Focus indicator') || descriptions[descIndex].includes('Focus order')) relatedCheckIds.push('kb-focus-visible', 'kb-focus-order');
    if (descriptions[descIndex].includes('ARIA live')) relatedCheckIds.push('sr-dynamic');
    // Add more mappings...

    // Only add the finding if the likelihood roll passes
     if (Math.random() < getFindingLikelihood(relatedCheckIds)) {
        findings.push({
        id: `finding-${i + 1}`,
        severity: severities[severityIndex],
        description: descriptions[descIndex],
        elementSelector: Math.random() > 0.3 ? selectors[descIndex % selectors.length] : undefined,
        recommendation: recommendations[descIndex % recommendations.length],
        wcagGuideline: Math.random() > 0.5 ? `WCAG ${guidelines[descIndex % guidelines.length]}` : undefined,
        });
     }
  }
  return findings;
};

const generateMockResults = (url: string, checkedItems: string[]): ScanResults => {
    const findings = generateMockFindings(checkedItems); // Pass checked items
    const summary = findings.reduce((acc, finding) => {
        if (finding.severity === 'Error') acc.errors++;
        if (finding.severity === 'Warning') acc.warnings++;
        if (finding.severity === 'Contrast') acc.contrastErrors++;
        if (finding.severity === 'Feature') acc.features++;
        if (finding.severity === 'ARIA') acc.aria++;
        if (finding.severity === 'Structure') acc.structure++;
        return acc;
    }, { errors: 0, warnings: 0, contrastErrors: 0, features: 0, aria: 0, structure: 0 });
    return { url, summary, findings, checklistConsidered: checkedItems.length > 0 };
}

// Severity mapping for badges
const severityMap: Record<AccessibilityFinding['severity'], { icon: React.ElementType, color: string, label: string }> = {
    Error: { icon: AlertCircle, color: 'bg-red-500 text-white', label: 'Error' },
    Warning: { icon: AlertTriangle, color: 'bg-yellow-500 text-black', label: 'Warning' },
    Contrast: { icon: Contrast, color: 'bg-orange-500 text-white', label: 'Contrast' },
    Feature: { icon: CheckCircle, color: 'bg-green-500 text-white', label: 'Feature' },
    Structure: { icon: Fingerprint, color: 'bg-blue-500 text-white', label: 'Structure' },
    ARIA: { icon: Accessibility, color: 'bg-purple-500 text-white', label: 'ARIA' },
    Info: { icon: Info, color: 'bg-gray-500 text-white', label: 'Info' },
};


export default function AccessibilityTesterClient() {
  const [scanUrl, setScanUrl] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [checklistState, setChecklistState] = useState<ManualChecklistState>(initialChecklistState); // State for checklist
  const [selectAllChecked, setSelectAllChecked] = useState<boolean | 'indeterminate'>(false); // State for "Select All"
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
    // Cleanup timers on unmount
    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

   // Effect to update the "Select All" checkbox state based on individual items
   useEffect(() => {
     const allChecked = checklistItems.every(item => checklistState[item.id]);
     const someChecked = checklistItems.some(item => checklistState[item.id]);

     if (allChecked) {
       setSelectAllChecked(true);
     } else if (someChecked) {
       setSelectAllChecked('indeterminate');
     } else {
       setSelectAllChecked(false);
     }
   }, [checklistState]);


  const simulateScan = async () => {
    if (!scanUrl) {
      toast({ title: 'URL Required', description: 'Please enter a URL to scan.', variant: 'destructive' });
      return;
    }
    // Clear previous timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setScanStatus('scanning');
    setScanProgress(0);
    setScanResults(null);
    let progress = 0;

    // Get currently checked items from the checklist state
    const checkedItems = Object.entries(checklistState)
                            .filter(([_, isChecked]) => isChecked)
                            .map(([id]) => id);

    let toastDescription = `Simulating scan for ${scanUrl}...`;
    if (checkedItems.length > 0) {
        toastDescription += ` (Considering ${checkedItems.length} manual checks)`;
    }

    toast({ title: 'Accessibility Scan Started', description: toastDescription });


    // Simulate progress
    intervalRef.current = setInterval(() => {
      progress += Math.random() * 15 + 5; // Random progress increment
      setScanProgress(Math.min(progress, 100));
      if (progress >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Don't set completed here, wait for timeout
      }
    }, 400);

    // Simulate completion
    timeoutRef.current = setTimeout(() => {
       if (intervalRef.current) clearInterval(intervalRef.current); // Ensure interval is cleared
       const results = generateMockResults(scanUrl, checkedItems); // Pass checked items to simulation
       setScanResults(results);
       setScanStatus('completed');
       toast({
         title: 'Scan Complete',
         description: `Found ${results.findings.length} potential items. Errors: ${results.summary.errors}, Warnings: ${results.summary.warnings}. ${results.checklistConsidered ? '(Checklist considered)' : ''}`,
       });
    }, 5000); // Simulate 5 second scan time
  };

   // Handler for individual checklist changes
   const handleChecklistChange = (id: string, checked: boolean | 'indeterminate') => {
       if (typeof checked === 'boolean') {
           setChecklistState(prev => ({ ...prev, [id]: checked }));
           // No need to update selectAllChecked here, the useEffect handles it
       }
   };

   // Handler for "Select All" checkbox changes
    const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
        if (typeof checked === 'boolean') {
            const newState: ManualChecklistState = {};
            checklistItems.forEach(item => {
                newState[item.id] = checked;
            });
            setChecklistState(newState);
            setSelectAllChecked(checked);
        }
        // Do nothing for indeterminate state change (it's driven by individual checks)
    };


   const getSeverityBadge = (severity: AccessibilityFinding['severity']) => {
      const config = severityMap[severity];
      if (!config) return <Badge variant="secondary">Unknown</Badge>;
      const Icon = config.icon;
      return (
          <Badge className={cn("flex items-center gap-1 whitespace-nowrap text-xs py-0.5 px-2", config.color)}>
              <Icon className="h-3 w-3" />
              {config.label}
          </Badge>
      );
  }

  if (!isClient) {
     return (
       <div className="flex items-center justify-center h-64">
         <Loader2 className="h-8 w-8 animate-spin text-accent" />
         <p className="ml-2 text-muted-foreground">Loading Accessibility Tester...</p>
       </div>
     );
  }

  return (
    <div className="space-y-8">
      {/* Scan Configuration Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><ScanSearch className="mr-2 h-5 w-5 text-accent"/>Start an Accessibility Scan</CardTitle>
          <CardDescription>Enter the URL of the page you want to test for accessibility issues (simulated scan).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-grow w-full">
              <Label htmlFor="url-input">Website URL</Label>
              <Input
                id="url-input"
                type="url"
                placeholder="https://example.com"
                value={scanUrl}
                onChange={(e) => setScanUrl(e.target.value)}
                disabled={scanStatus === 'scanning'}
                className="w-full"
              />
            </div>
            <Button onClick={simulateScan} disabled={scanStatus === 'scanning' || !scanUrl} className="w-full sm:w-auto">
               {scanStatus === 'scanning' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
               {scanStatus === 'scanning' ? 'Scanning...' : 'Scan Page'}
            </Button>
          </div>
           {scanStatus === 'scanning' && (
             <div className="mt-4 space-y-1">
                 <Progress value={scanProgress} className="w-full" />
                 <p className="text-xs text-muted-foreground text-center">Simulating scan... {scanProgress.toFixed(0)}%</p>
             </div>
           )}
           {scanStatus === 'error' && <p className="text-sm text-destructive text-center mt-4">Scan failed. Please try again.</p>}
        </CardContent>
      </Card>

      {/* Manual Testing Center Card - Moved Before Results */}
       <Card className="shadow-lg">
         <CardHeader>
           <CardTitle className="text-primary flex items-center"><ListChecks className="mr-2 h-5 w-5 text-accent"/>Manual Testing Checklist</CardTitle>
           <CardDescription>
                Perform essential manual checks to enhance automated testing. Checking items will influence the next simulated scan results.
            </CardDescription>
         </CardHeader>
         <CardContent>
             <div className="mb-4 border-b pb-4">
                 <Checkbox
                     id="select-all-checklist"
                     label={<span className="font-semibold">Select All / Deselect All</span>}
                     checked={selectAllChecked}
                     onCheckedChange={handleSelectAllChange}
                 />
            </div>
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Group checklist items by category */}
                {(['Keyboard Navigation', 'Screen Reader Compatibility'] as const).map(category => (
                    <div key={category} className="space-y-3">
                        <h3 className="font-semibold text-foreground flex items-center">
                            {category === 'Keyboard Navigation' ? <Keyboard className="mr-2 h-4 w-4"/> : <Accessibility className="mr-2 h-4 w-4"/>}
                            {category}
                        </h3>
                        {checklistItems
                            .filter(item => item.category === category)
                            .map(item => (
                                <Checkbox
                                    key={item.id}
                                    id={item.id}
                                    label={item.label}
                                    checked={checklistState[item.id]}
                                    onCheckedChange={(checked) => handleChecklistChange(item.id, checked)}
                                />
                            ))
                        }
                    </div>
                ))}
            </div>
         </CardContent>
         <CardFooter className="flex justify-between items-center">
             <p className="text-xs text-muted-foreground">Changes apply to the next scan.</p>
             <Button variant="outline" size="sm" onClick={() => setChecklistState(initialChecklistState)}>Reset Checklist</Button>
         </CardFooter>
       </Card>


      {/* Scan Results Card */}
      <Card className="shadow-lg min-h-[400px] flex flex-col"> {/* Ensure minimum height */}
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><Accessibility className="mr-2 h-5 w-5 text-accent"/>Scan Results</CardTitle>
          <CardDescription>Review the findings from the latest accessibility scan for <code className="text-xs bg-muted px-1 rounded">{scanResults?.url || 'N/A'}</code>.</CardDescription>
            {scanResults?.checklistConsidered && (
                 <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 mt-1">
                     <CheckSquare size={14}/> Manual checklist items were considered in this simulation.
                 </p>
            )}
        </CardHeader>
        <CardContent className="flex-grow">
          {scanStatus === 'idle' && !scanResults && (
             <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg h-full flex flex-col justify-center items-center">
                <ScanSearch className="mx-auto h-12 w-12 mb-4" />
                <p>Run a scan using the panel above to see the results here.</p>
             </div>
          )}
           {scanStatus === 'scanning' && (
             <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg h-full flex flex-col justify-center items-center">
                <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin text-accent" />
                <p>Scan in progress...</p>
             </div>
          )}
          {scanStatus === 'completed' && scanResults && (
            <Tabs defaultValue="summary" className="w-full flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="errors">Errors ({scanResults.summary.errors})</TabsTrigger>
                    <TabsTrigger value="warnings">Warnings ({scanResults.summary.warnings + scanResults.summary.contrastErrors})</TabsTrigger>
                    <TabsTrigger value="other">Other ({scanResults.summary.features + scanResults.summary.aria + scanResults.summary.structure})</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="mt-4 flex-grow">
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/20">
                        <div className="text-center p-3 rounded bg-background shadow-sm">
                            <p className="text-3xl font-bold text-destructive">{scanResults.summary.errors}</p>
                            <p className="text-sm font-medium text-muted-foreground">Errors</p>
                        </div>
                        <div className="text-center p-3 rounded bg-background shadow-sm">
                            <p className="text-3xl font-bold text-yellow-600">{scanResults.summary.warnings}</p>
                            <p className="text-sm font-medium text-muted-foreground">Warnings</p>
                        </div>
                        <div className="text-center p-3 rounded bg-background shadow-sm">
                            <p className="text-3xl font-bold text-orange-600">{scanResults.summary.contrastErrors}</p>
                            <p className="text-sm font-medium text-muted-foreground">Contrast Errors</p>
                        </div>
                        <div className="text-center p-3 rounded bg-background shadow-sm">
                            <p className="text-3xl font-bold text-green-600">{scanResults.summary.features}</p>
                            <p className="text-sm font-medium text-muted-foreground">Features</p>
                        </div>
                        <div className="text-center p-3 rounded bg-background shadow-sm">
                            <p className="text-3xl font-bold text-blue-600">{scanResults.summary.structure}</p>
                            <p className="text-sm font-medium text-muted-foreground">Structural</p>
                        </div>
                         <div className="text-center p-3 rounded bg-background shadow-sm">
                            <p className="text-3xl font-bold text-purple-600">{scanResults.summary.aria}</p>
                            <p className="text-sm font-medium text-muted-foreground">ARIA</p>
                        </div>
                   </div>
                </TabsContent>
                 {/* Generic Tab Content for Findings */}
                {(['errors', 'warnings', 'other']).map(tabValue => (
                   <TabsContent key={tabValue} value={tabValue} className="mt-4 flex-grow">
                       <ScrollArea className="h-[350px] border rounded-lg"> {/* Ensure scroll area has height */}
                           <Table>
                             <TableHeader>
                               <TableRow>
                                 <TableHead className="w-[120px]">Severity</TableHead>
                                 <TableHead>Description</TableHead>
                                 <TableHead>Element/Location</TableHead> {/* Updated Header */}
                                 <TableHead>Guideline</TableHead>
                                 <TableHead>Recommendation</TableHead>
                               </TableRow>
                             </TableHeader>
                             <TableBody>
                               {scanResults.findings
                                .filter(finding => {
                                    if (tabValue === 'errors') return finding.severity === 'Error';
                                    if (tabValue === 'warnings') return finding.severity === 'Warning' || finding.severity === 'Contrast';
                                    if (tabValue === 'other') return ['Feature', 'Structure', 'ARIA', 'Info'].includes(finding.severity);
                                    return false;
                                })
                               .map((finding) => (
                                 <TableRow key={finding.id}>
                                   <TableCell>{getSeverityBadge(finding.severity)}</TableCell>
                                   <TableCell>{finding.description}</TableCell>
                                   <TableCell>
                                        {finding.elementSelector ? (
                                            <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded inline-flex items-center">
                                                <Code size={12} className="mr-1"/> {finding.elementSelector}
                                            </code>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">N/A</span>
                                        )}
                                    </TableCell>
                                   <TableCell>{finding.wcagGuideline || '-'}</TableCell>
                                   <TableCell className="text-xs">{finding.recommendation}</TableCell>
                                 </TableRow>
                               ))}
                             </TableBody>
                           </Table>
                           {scanResults.findings.filter(finding => {
                                if (tabValue === 'errors') return finding.severity === 'Error';
                                if (tabValue === 'warnings') return finding.severity === 'Warning' || finding.severity === 'Contrast';
                                if (tabValue === 'other') return ['Feature', 'Structure', 'ARIA', 'Info'].includes(finding.severity);
                                return false;
                            }).length === 0 && (
                                <div className="text-center p-4 text-muted-foreground">No findings in this category.</div>
                            )}
                       </ScrollArea>
                   </TabsContent>
                 ))}
            </Tabs>
          )}
          {scanStatus === 'error' && (
               <div className="text-center text-destructive p-6 border border-dashed border-destructive rounded-lg h-full flex flex-col justify-center items-center">
                    <Siren className="mx-auto h-12 w-12 mb-4" />
                    <p>An error occurred during the scan simulation.</p>
               </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
