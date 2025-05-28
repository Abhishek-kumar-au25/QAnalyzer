
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, ScanLine, Construction, CheckCircle, AlertCircle, Info, Loader2, FileText, Code, ListChecks, ExternalLink, AlertTriangle, Download } from "lucide-react"; // Added AlertTriangle, Download
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

// OWASP Top 10 2021 Categories (for informational purposes)
const owaspTop10Categories = [
  { id: "A01", name: "Broken Access Control", description: "Restrictions on what authenticated users are allowed to do are often not properly enforced." },
  { id: "A02", name: "Cryptographic Failures", description: "Failures related to cryptography (or lack thereof) often lead to exposure of sensitive data." },
  { id: "A03", name: "Injection", description: "Injection flaws, such as SQL, NoSQL, OS, and LDAP injection, occur when untrusted data is sent to an interpreter as part of a command or query." },
  { id: "A04", name: "Insecure Design", description: "A new category for 2021, with a focus on risks related to design flaws." },
  { id: "A05", name: "Security Misconfiguration", description: "This includes missing appropriate security hardening across any part of the application stack or improperly configured permissions." },
  { id: "A06", name: "Vulnerable and Outdated Components", description: "Using components with known vulnerabilities." },
  { id: "A07", name: "Identification and Authentication Failures", description: "Confirmation of user identity, authentication, and session management can be compromised." },
  { id: "A08", name: "Software and Data Integrity Failures", description: "This category focuses on making assumptions related to software updates, critical data, and CI/CD pipelines without verifying integrity." },
  { id: "A09", name: "Security Logging and Monitoring Failures", description: "Insufficient logging and monitoring, coupled with missing or ineffective integration with incident response." },
  { id: "A10", name: "Server-Side Request Forgery (SSRF)", description: "SSRF flaws occur whenever a web application is fetching a remote resource without validating the user-supplied URL." },
];

interface OwaspFinding {
  id: string;
  category: string; // OWASP Category ID (e.g., "A01")
  name: string; // OWASP Category Name
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  description: string;
  vulnerableUrlOrComponent: string;
  recommendation: string;
  evidence?: string; // e.g., payload used, log snippet
  cwe?: string; // Common Weakness Enumeration
}

interface OwaspScanResults {
  targetUrl: string;
  scanDate: Date;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
    total: number;
  };
  findings: OwaspFinding[];
}

type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';

const generateMockOwaspFindings = (url: string): OwaspScanResults => {
    const findings: OwaspFinding[] = [];
    const numFindings = Math.floor(Math.random() * 8) + 3; // 3 to 10 findings

    const severities: OwaspFinding['severity'][] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
    const exampleVulnerablePaths = ['/login.php', '/admin/panel', '/api/users?id=', '/search?query=', 'jquery-1.8.0.min.js', 'Struts2 Core', 'Apache/2.4.29'];
    const exampleRecommendations = [
        'Implement proper access controls based on user roles and permissions. Deny by default.',
        'Use strong, up-to-date encryption algorithms. Store sensitive data encrypted at rest.',
        'Use parameterized queries or ORMs to prevent SQL injection. Sanitize all user inputs.',
        'Perform threat modeling during the design phase. Implement secure design patterns.',
        'Regularly review and update security configurations. Remove default credentials and unnecessary features.',
        'Use a dependency checker tool. Keep all components and libraries up to date.',
        'Implement multi-factor authentication. Use strong session management techniques.',
        'Verify the integrity of software updates and data. Secure the CI/CD pipeline.',
        'Ensure comprehensive logging of security events. Integrate with an incident response system.',
        'Validate and sanitize all user-supplied URLs for server-side requests. Use an allowlist approach.',
    ];
    const exampleEvidence = [
      "Payload: ' OR '1'='1",
      "Exposed admin interface at /admin",
      "Vulnerable library: commons-collections-3.1.jar",
      "Missing HttpOnly and Secure flags on session cookie",
      "Directory listing enabled on /uploads/",
    ];

    for (let i = 0; i < numFindings; i++) {
        const category = owaspTop10Categories[Math.floor(Math.random() * owaspTop10Categories.length)];
        findings.push({
            id: `owasp-${i + 1}-${Math.random().toString(16).slice(2, 8)}`,
            category: category.id,
            name: category.name,
            severity: severities[Math.floor(Math.random() * severities.length)],
            description: `Simulated finding related to ${category.name}. Further investigation needed.`,
            vulnerableUrlOrComponent: exampleVulnerablePaths[Math.floor(Math.random() * exampleVulnerablePaths.length)],
            recommendation: exampleRecommendations[Math.floor(Math.random() * exampleRecommendations.length)],
            evidence: Math.random() > 0.5 ? exampleEvidence[Math.floor(Math.random() * exampleEvidence.length)] : undefined,
            cwe: `CWE-${Math.floor(Math.random() * 1000) + 1}`,
        });
    }

    const summary = findings.reduce((acc, f) => {
        acc[f.severity.toLowerCase() as keyof typeof acc]++;
        acc.total++;
        return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0, informational: 0, total: 0 });

    return {
        targetUrl: url,
        scanDate: new Date(),
        summary,
        findings,
    };
};

const severityMap: Record<OwaspFinding['severity'], { icon: React.ElementType, color: string }> = {
    Critical: { icon: AlertCircle, color: 'bg-red-700 text-white' },
    High: { icon: AlertTriangle, color: 'bg-red-500 text-white' },
    Medium: { icon: ShieldAlert, color: 'bg-yellow-500 text-black' },
    Low: { icon: Info, color: 'bg-blue-500 text-white' },
    Informational: { icon: CheckCircle, color: 'bg-gray-500 text-white' },
};


export default function OwaspTesterClient() {
  const [targetUrl, setTargetUrl] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<OwaspScanResults | null>(null);
  const { toast } = useToast();
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
    // Cleanup timers on unmount
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, []);

  const simulateOwaspScan = async () => {
    if (!targetUrl) {
      toast({ title: 'Target URL Required', description: 'Please enter a URL to scan.', variant: 'destructive' });
      return;
    }
    // Basic URL validation (add http:// if missing)
    let formattedUrl = targetUrl;
    if (!/^https?:\/\//i.test(targetUrl)) {
      formattedUrl = `https://${targetUrl}`;
      setTargetUrl(formattedUrl);
    }

    // Clear previous timers
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    setScanStatus('scanning');
    setScanProgress(0);
    setScanResults(null);
    let progress = 0;

    toast({ title: 'OWASP Scan Started', description: `Simulating OWASP Top 10 analysis for ${formattedUrl}...` });

    scanIntervalRef.current = setInterval(() => {
      progress += Math.random() * 10 + 5; // Slower progress for OWASP scan
      setScanProgress(Math.min(progress, 100));
      if (progress >= 100) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      }
    }, 700); // Slower interval

    scanTimeoutRef.current = setTimeout(() => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      const results = generateMockOwaspFindings(formattedUrl);
      setScanResults(results);
      setScanStatus('completed');
      toast({
        title: 'OWASP Scan Complete',
        description: `Analysis for ${results.targetUrl} finished. Found ${results.summary.total} potential issues.`,
      });
    }, 8000); // Simulate 8 second scan time
  };

  const getSeverityBadge = (severity: OwaspFinding['severity']) => {
    const config = severityMap[severity];
    const Icon = config.icon;
    return (
      <Badge className={cn("flex items-center gap-1 whitespace-nowrap text-xs", config.color)}>
        <Icon className="h-3 w-3" />
        {severity}
      </Badge>
    );
  };

  const handleDownloadReport = () => {
    if (!scanResults) {
      toast({ title: 'No Results', description: 'Please run a scan first.', variant: 'destructive' });
      return;
    }

    let reportContent = `OWASP Scan Report for: ${scanResults.targetUrl}\n`;
    reportContent += `Scan Date: ${scanResults.scanDate.toLocaleDateString()}\n`;
    reportContent += `Summary:\n`;
    reportContent += `  Critical: ${scanResults.summary.critical}\n`;
    reportContent += `  High: ${scanResults.summary.high}\n`;
    reportContent += `  Medium: ${scanResults.summary.medium}\n`;
    reportContent += `  Low: ${scanResults.summary.low}\n`;
    reportContent += `  Informational: ${scanResults.summary.informational}\n`;
    reportContent += `  Total Issues: ${scanResults.summary.total}\n`;
    reportContent += `============================================\n\n`;
    reportContent += `Findings:\n`;
    reportContent += `--------------------------------------------\n`;

    if (scanResults.findings.length === 0) {
      reportContent += `No specific findings reported.\n`;
    } else {
      scanResults.findings.forEach(finding => {
        reportContent += `ID: ${finding.id}\n`;
        reportContent += `Category: ${finding.category} - ${finding.name}\n`;
        reportContent += `Severity: ${finding.severity}\n`;
        reportContent += `Description: ${finding.description}\n`;
        reportContent += `Vulnerable URL/Component: ${finding.vulnerableUrlOrComponent}\n`;
        reportContent += `Recommendation: ${finding.recommendation}\n`;
        if (finding.evidence) {
          reportContent += `Evidence: ${finding.evidence}\n`;
        }
        if (finding.cwe) {
          reportContent += `CWE: ${finding.cwe}\n`;
        }
        reportContent += `--------------------------------------------\n`;
      });
    }

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const urlHostname = new URL(scanResults.targetUrl).hostname;
    link.download = `OWASP_Report_${urlHostname.replace(/\./g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({ title: 'Report Downloaded', description: 'OWASP scan report saved as a text file.' });
  };


  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="ml-2 text-muted-foreground">Loading OWASP Tester...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Scan Configuration Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><ScanLine className="mr-2 h-5 w-5 text-accent"/>OWASP Top 10 Scan</CardTitle>
          <CardDescription>Enter a target URL to perform a simulated OWASP Top 10 vulnerability scan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-grow w-full">
              <Label htmlFor="target-url-owasp">Target URL</Label>
              <Input
                id="target-url-owasp"
                type="url"
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                disabled={scanStatus === 'scanning'}
                className="w-full"
              />
            </div>
            <Button onClick={simulateOwaspScan} disabled={scanStatus === 'scanning' || !targetUrl} className="w-full sm:w-auto">
              {scanStatus === 'scanning' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
              {scanStatus === 'scanning' ? 'Scanning...' : 'Start OWASP Scan'}
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

      {/* Scan Results Card */}
      <Card className="shadow-lg min-h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><ListChecks className="mr-2 h-5 w-5 text-accent"/>OWASP Scan Results</CardTitle>
          <CardDescription>Review findings from the simulated OWASP scan for <code className="text-xs bg-muted px-1 rounded">{scanResults?.targetUrl || 'N/A'}</code>.</CardDescription>
          {scanResults && (
            <p className="text-xs text-muted-foreground mt-1">Scan Date: {new Date(scanResults.scanDate).toLocaleDateString()}</p>
          )}
        </CardHeader>
        <CardContent className="flex-grow">
          {scanStatus === 'idle' && !scanResults && (
            <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg h-full flex flex-col justify-center items-center">
              <ShieldAlert className="mx-auto h-12 w-12 mb-4" />
              <p>Run an OWASP scan to see results here.</p>
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary ({scanResults.summary.total})</TabsTrigger>
                <TabsTrigger value="findings">All Findings ({scanResults.findings.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="mt-4 flex-grow">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/20">
                    {Object.entries(scanResults.summary)
                        .filter(([key]) => key !== 'total') // Exclude total for individual display
                        .map(([severity, count]) => {
                            const severityConfig = severityMap[severity.charAt(0).toUpperCase() + severity.slice(1) as keyof typeof severityMap];
                            const Icon = severityConfig?.icon || Info;
                            return (
                                <div key={severity} className="text-center p-3 rounded bg-background shadow-sm">
                                    <Icon className={cn("h-6 w-6 mx-auto mb-1", severityConfig?.color.replace(/bg-(\w+)-(\d+)/, 'text-$1-$2').replace('text-white', 'text-primary-foreground').replace('text-black', 'text-secondary-foreground'))} />
                                    <p className="text-2xl font-bold text-foreground">{count as number}</p>
                                    <p className="text-sm font-medium text-muted-foreground capitalize">{severity}</p>
                                </div>
                            );
                    })}
                </div>
                <div className="mt-4 text-center">
                    <p className="text-lg font-semibold text-foreground">Total Potential Issues Found: {scanResults.summary.total}</p>
                </div>
              </TabsContent>
              <TabsContent value="findings" className="mt-4 flex-grow">
                <ScrollArea className="h-[500px] border rounded-lg">
                  {scanResults.findings.length === 0 ? (
                     <div className="text-center p-4 text-muted-foreground">No specific findings reported.</div>
                  ) : (
                    <Accordion type="multiple" className="w-full">
                        {scanResults.findings.map((finding) => (
                            <AccordionItem key={finding.id} value={finding.id} className="border-b last:border-b-0">
                                <AccordionTrigger className="text-sm hover:no-underline px-4 py-3">
                                    <div className="flex items-center gap-3 flex-grow mr-4 overflow-hidden">
                                        {getSeverityBadge(finding.severity)}
                                        <span className="font-semibold text-foreground truncate" title={`${finding.category} - ${finding.name}`}>{finding.category} - {finding.name}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-3 pt-1 text-xs bg-muted/30">
                                    <p><strong className="text-muted-foreground">Description:</strong> {finding.description}</p>
                                    <p><strong className="text-muted-foreground">Vulnerable Component/URL:</strong> <code className="text-[11px] bg-muted px-1 rounded">{finding.vulnerableUrlOrComponent}</code></p>
                                    <p><strong className="text-muted-foreground">Recommendation:</strong> {finding.recommendation}</p>
                                    {finding.evidence && <p><strong className="text-muted-foreground">Evidence:</strong> <code className="text-[11px] bg-muted px-1 rounded">{finding.evidence}</code></p>}
                                    {finding.cwe && <p><strong className="text-muted-foreground">CWE:</strong> <a href={`https://cwe.mitre.org/data/definitions/${finding.cwe.replace('CWE-','')}.html`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{finding.cwe} <ExternalLink size={12} className="inline ml-0.5"/></a></p>}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
          {scanStatus === 'error' && (
            <div className="text-center text-destructive p-6 border border-dashed border-destructive rounded-lg h-full flex flex-col justify-center items-center">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
              <p>An error occurred during the OWASP scan simulation.</p>
            </div>
          )}
        </CardContent>
        {scanStatus === 'completed' && scanResults && (
             <CardFooter>
                 <Button variant="outline" size="sm" onClick={handleDownloadReport} disabled={!scanResults}>
                    <Download className="mr-2 h-4 w-4"/> Download Full Report
                 </Button>
             </CardFooter>
        )}
      </Card>

       {/* Informational OWASP Top 10 Card */}
       <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-primary flex items-center"><Info className="mr-2 h-5 w-5 text-accent" />OWASP Top 10 - 2021 Overview</CardTitle>
                <CardDescription>
                    The OWASP Top 10 represents a broad consensus about the most critical security risks to web applications.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {owaspTop10Categories.map((category) => (
                        <AccordionItem value={category.id} key={category.id}>
                            <AccordionTrigger className="text-sm font-medium">{category.id}: {category.name}</AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground">
                                {category.description}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">
                    This is a simplified overview. For detailed information, visit the <a href="https://owasp.org/Top10/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">official OWASP Top 10 project page <ExternalLink size={12} className="inline ml-0.5"/></a>.
                </p>
            </CardFooter>
       </Card>

    </div>
  );
}

