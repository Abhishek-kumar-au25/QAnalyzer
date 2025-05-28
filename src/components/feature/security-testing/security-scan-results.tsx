
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'; // Added CardFooter
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bug, Info, ShieldAlert, ShieldCheck, Code, FileText, Download } from 'lucide-react'; // Added Download
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast'; // Added useToast

// Interface mirroring structure from security testing page
export interface ScanFinding {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  type: string; // e.g., 'SQL Injection', 'Outdated Dependency'
  description: string;
  recommendation: string;
  location: string; // e.g., '/login', 'package.json', CSS Selector
  elementSelector?: string; // More specific selector if applicable
  stepsToReproduce?: string[];
  logSnippet?: string;
}

interface SecurityScanResultsProps {
  scanFindings: ScanFinding[];
  auditFindings?: ScanFinding[];
  auditSummary?: string;
}

const severityMap: Record<ScanFinding['severity'], { icon: React.ElementType, color: string }> = {
    Critical: { icon: ShieldAlert, color: 'bg-red-700 text-white' },
    High: { icon: AlertTriangle, color: 'bg-red-500 text-white' },
    Medium: { icon: Bug, color: 'bg-yellow-500 text-black' },
    Low: { icon: ShieldCheck, color: 'bg-blue-500 text-white' },
    Informational: { icon: Info, color: 'bg-gray-500 text-white' },
};

export function SecurityScanResults({ scanFindings, auditFindings = [], auditSummary }: SecurityScanResultsProps) {
  const { toast } = useToast(); // Initialize useToast
  const allFindings = [...scanFindings, ...auditFindings];

  const getSeverityBadge = (severity: ScanFinding['severity']) => {
      const config = severityMap[severity];
      const Icon = config.icon;
      return (
          <Badge className={cn("flex items-center gap-1 whitespace-nowrap", config.color)}>
              <Icon className="h-3 w-3" />
              {severity}
          </Badge>
      );
  }

  const renderFindingDetails = (finding: ScanFinding) => (
    <div className="space-y-2 text-xs pl-4 pt-2 pb-3">
        <p><strong className="text-muted-foreground">Description:</strong> {finding.description}</p>
        <p><strong className="text-muted-foreground">Location:</strong> <code className="text-[11px] bg-muted px-1 rounded">{finding.location}</code></p>
        {finding.elementSelector && <p><strong className="text-muted-foreground">Element Selector:</strong> <code className="text-[11px] bg-muted px-1 rounded">{finding.elementSelector}</code></p>}
        <p><strong className="text-muted-foreground">Recommendation:</strong> {finding.recommendation}</p>
         {finding.stepsToReproduce && finding.stepsToReproduce.length > 0 && (
             <div>
                 <strong className="text-muted-foreground">Steps to Reproduce:</strong>
                 <ol className="list-decimal list-inside pl-4">
                     {finding.stepsToReproduce.map((step, i) => <li key={i}>{step}</li>)}
                 </ol>
             </div>
        )}
         {finding.logSnippet && (
             <div>
                 <strong className="text-muted-foreground">Log Snippet:</strong>
                 <pre className="mt-1 p-2 bg-muted rounded-md text-[11px] overflow-x-auto"><code className="font-mono">{finding.logSnippet}</code></pre>
             </div>
         )}
    </div>
  );

  const handleDownloadReport = () => {
    if (allFindings.length === 0) {
      toast({ title: 'No Findings', description: 'There are no findings to report.', variant: 'destructive' });
      return;
    }

    let reportContent = `Security Scan and Audit Report\n`;
    reportContent += `Report Date: ${new Date().toLocaleDateString()}\n`;
    reportContent += `============================================\n\n`;

    if (scanFindings.length > 0) {
      reportContent += `Automated Vulnerability Scan Findings (${scanFindings.length}):\n`;
      reportContent += `--------------------------------------------\n`;
      scanFindings.forEach(finding => {
        reportContent += `ID: ${finding.id}\n`;
        reportContent += `Severity: ${finding.severity}\n`;
        reportContent += `Type: ${finding.type}\n`;
        reportContent += `Description: ${finding.description}\n`;
        reportContent += `Location/Element: ${finding.elementSelector || finding.location}\n`;
        reportContent += `Recommendation: ${finding.recommendation}\n`;
        if (finding.stepsToReproduce && finding.stepsToReproduce.length > 0) {
            reportContent += `Steps to Reproduce:\n${finding.stepsToReproduce.map(s => `  - ${s}`).join('\n')}\n`;
        }
        if (finding.logSnippet) {
            reportContent += `Log Snippet:\n${finding.logSnippet}\n`;
        }
        reportContent += `--------------------------------------------\n`;
      });
      reportContent += `\n`;
    }

    if (auditFindings.length > 0) {
      reportContent += `Dependency Audit Findings (${auditFindings.length}):\n`;
      if (auditSummary) {
        reportContent += `Summary: ${auditSummary}\n`;
      }
      reportContent += `--------------------------------------------\n`;
      auditFindings.forEach(finding => {
        reportContent += `ID: ${finding.id}\n`;
        reportContent += `Severity: ${finding.severity}\n`;
        reportContent += `Type: ${finding.type}\n`;
        reportContent += `Description: ${finding.description}\n`;
        reportContent += `Location/Component: ${finding.location}\n`;
        reportContent += `Recommendation: ${finding.recommendation}\n`;
         if (finding.logSnippet) { // Audit findings might also have logs
            reportContent += `Details/Log:\n${finding.logSnippet}\n`;
        }
        reportContent += `--------------------------------------------\n`;
      });
    }

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Security_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({ title: 'Report Downloaded', description: 'Security report saved as a text file.' });
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-primary">Security Scan & Audit Results</CardTitle>
        <CardDescription>Summary of findings from the simulated scans.</CardDescription>
         {auditSummary && (
             <p className="text-sm font-medium text-muted-foreground pt-2">Dependency Audit: <span className="text-foreground">{auditSummary}</span></p>
         )}
      </CardHeader>
      <CardContent>
        {allFindings.length === 0 ? (
          <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
            <ShieldCheck className="mx-auto h-10 w-10 mb-2" />
            No findings reported from the scans.
          </div>
        ) : (
            <Accordion type="multiple" className="w-full space-y-3">
              {allFindings.map((finding) => (
                <AccordionItem key={finding.id} value={finding.id} className="border rounded-lg px-4 bg-background hover:bg-muted/20 transition-colors">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-grow mr-4 overflow-hidden">
                        {getSeverityBadge(finding.severity)}
                        <span className="font-semibold text-foreground truncate" title={finding.type}>{finding.type}</span>
                        <span className="text-muted-foreground text-xs truncate hidden sm:inline" title={finding.description}>{finding.description}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                     {renderFindingDetails(finding)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
        )}
      </CardContent>
       {allFindings.length > 0 && (
           <CardFooter>
               <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="mr-2 h-4 w-4"/> Download Full Report
               </Button>
           </CardFooter>
       )}
    </Card>
  );
}

