
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import { Search, CheckCircle, AlertTriangle, Info, XCircle, Loader2, FileText, Link2, Smartphone, Zap, Gauge, Code, Download } from "lucide-react"; // Added Code icon, Download
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types for SEO Scan Results
type SeoStatus = 'Pass' | 'Warning' | 'Fail' | 'Info';

interface SeoFinding {
  id: string;
  check: string;
  status: SeoStatus;
  details: string | React.ReactNode;
  recommendation?: string;
  elementSelector?: string; // Optional CSS selector or XPath for the related element
}

interface SeoScanResults {
  url: string;
  overallScore?: number; // Optional overall score (0-100)
  categories: {
    onPage: SeoFinding[];
    technical: SeoFinding[];
    content: SeoFinding[];
    links: SeoFinding[];
    performance: SeoFinding[];
    mobile: SeoFinding[];
  };
}

type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';

// Mock Data Generation
const generateMockSeoResults = (url: string): SeoScanResults => {
  const score = Math.floor(Math.random() * 41) + 60; // Score between 60 and 100

  // Helper to create findings
  const createFinding = (idBase: string, check: string, statusOptions: SeoStatus[], detailsFn: () => string | React.ReactNode, recommendation?: string, elementSelector?: string): SeoFinding => {
    const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    return {
      id: `${idBase}-${Math.random().toString(36).substring(7)}`,
      check,
      status,
      details: detailsFn(),
      recommendation,
      elementSelector, // Add elementSelector
    };
  };

  const titleLength = Math.floor(Math.random() * 40) + 30; // 30-70 chars
  const descLength = Math.floor(Math.random() * 100) + 70; // 70-170 chars
  const hasOneH1 = Math.random() > 0.1;

  return {
    url,
    overallScore: score,
    categories: {
      onPage: [
        createFinding('title', 'Title Tag', ['Pass', 'Warning'], () => `Length: ${titleLength} characters. ${titleLength < 50 || titleLength > 60 ? 'Optimal length is 50-60 characters.' : 'Good length.'}`, titleLength < 50 || titleLength > 60 ? 'Adjust title length to be between 50-60 characters.' : undefined, 'title'),
        createFinding('desc', 'Meta Description', ['Pass', 'Warning', 'Fail'], () => `Length: ${descLength} characters. ${descLength < 120 || descLength > 158 ? 'Optimal length is 120-158 characters.' : 'Good length.'}`, descLength < 120 || descLength > 158 ? 'Adjust meta description length to be between 120-158 characters.' : undefined, 'meta[name="description"]'),
        createFinding('h1', 'H1 Heading', hasOneH1 ? ['Pass'] : ['Fail'], () => hasOneH1 ? 'Exactly one H1 heading found.' : 'Missing or multiple H1 headings found.', hasOneH1 ? undefined : 'Ensure exactly one H1 heading exists on the page.', 'h1'),
        createFinding('h2', 'H2-H6 Headings', ['Pass', 'Info'], () => 'Headings structure seems logical.', 'Review heading structure for semantic correctness.', 'h2, h3, h4, h5, h6'),
        createFinding('img-alt', 'Image Alt Text', ['Pass', 'Warning'], () => Math.random() > 0.2 ? 'Most images have alt text.' : 'Some images are missing alt text.', Math.random() > 0.2 ? undefined : 'Add descriptive alt text to all meaningful images.', 'img:not([alt])'),
      ],
      technical: [
        createFinding('robots', 'Robots.txt', ['Pass', 'Info'], () => 'Robots.txt file found and seems valid.', 'Ensure robots.txt allows crawling of important pages.'),
        createFinding('sitemap', 'XML Sitemap', ['Pass', 'Info'], () => 'XML Sitemap detected.', 'Verify the sitemap is up-to-date and submitted to search engines.'),
        createFinding('https', 'HTTPS Usage', ['Pass'], () => 'Site uses HTTPS.', undefined),
        createFinding('url-canon', 'URL Canonicalization', ['Pass', 'Warning'], () => Math.random() > 0.3 ? 'Canonical tags appear correct.' : 'Potential duplicate content issues (e.g., www vs non-www).', Math.random() > 0.3 ? undefined : 'Implement canonical tags to specify the preferred URL version.', 'link[rel="canonical"]'),
      ],
      content: [
         createFinding('kw-density', 'Keyword Usage (Simulated)', ['Info'], () => 'Keywords appear relevant to the (simulated) content analysis.', 'Ensure primary keywords are naturally integrated into titles, headings, and body text.'),
         createFinding('content-len', 'Content Length (Simulated)', ['Pass', 'Info'], () => 'Page content length seems adequate.', 'Ensure content is comprehensive and provides value to the user.'),
         createFinding('readability', 'Readability (Simulated)', ['Pass', 'Info'], () => 'Content readability score is good.', 'Use clear language, short paragraphs, and headings/subheadings.'),
      ],
      links: [
        createFinding('int-links', 'Internal Links', ['Pass', 'Info'], () => 'Sufficient internal links found.', 'Ensure logical internal linking structure to help users and search engines navigate.', 'a[href^="/"]'), // Example selector for internal links
        createFinding('ext-links', 'External Links', ['Info'], () => 'External links are present.', 'Link to reputable external sources where relevant.', 'a[href^="http"]'), // Example selector for external links
        createFinding('broken-links', 'Broken Links (Simulated)', ['Pass', 'Warning'], () => Math.random() > 0.1 ? 'No broken links detected.' : 'Potential broken links found.', Math.random() > 0.1 ? undefined : 'Regularly check for and fix broken links.'),
      ],
      performance: [
        createFinding('page-speed', 'Page Speed Score (Simulated)', ['Pass', 'Warning'], () => `Simulated Score: ${Math.floor(Math.random() * 31) + 70}/100.`, 'Optimize images, leverage browser caching, and minimize JavaScript.'),
        createFinding('core-web-vitals', 'Core Web Vitals (Simulated)', ['Info'], () => 'LCP, FID, CLS metrics appear within acceptable ranges (simulated).', 'Monitor Core Web Vitals in Google Search Console and address issues.'),
      ],
      mobile: [
         createFinding('mobile-friendly', 'Mobile Friendliness', ['Pass'], () => 'Page appears mobile-friendly (uses viewport meta tag).', undefined, 'meta[name="viewport"]'),
         createFinding('tap-targets', 'Tap Target Size', ['Pass', 'Warning'], () => Math.random() > 0.15 ? 'Tap targets (buttons, links) seem adequately sized.' : 'Some tap targets might be too small or close together.', Math.random() > 0.15 ? undefined : 'Ensure interactive elements are large enough and spaced appropriately for touchscreens.', 'button, a'), // Example selector for tap targets
      ],
    },
  };
};

// Status mapping for badges
const statusMap: Record<SeoStatus, { icon: React.ElementType, color: string, label: string }> = {
  Pass: { icon: CheckCircle, color: 'bg-green-500 text-white', label: 'Pass' },
  Warning: { icon: AlertTriangle, color: 'bg-yellow-500 text-black', label: 'Warning' },
  Fail: { icon: XCircle, color: 'bg-red-500 text-white', label: 'Fail' },
  Info: { icon: Info, color: 'bg-blue-500 text-white', label: 'Info' },
};


export default function SeoTesterClient() {
  const [scanUrl, setScanUrl] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<SeoScanResults | null>(null);
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

  const simulateScan = async () => {
    if (!scanUrl) {
      toast({ title: 'URL Required', description: 'Please enter a URL to analyze.', variant: 'destructive' });
      return;
    }
    // Basic URL validation (add http:// if missing)
    let formattedUrl = scanUrl;
    if (!/^https?:\/\//i.test(scanUrl)) {
      formattedUrl = `https://${scanUrl}`;
      setScanUrl(formattedUrl); // Update input field as well
    }

    // Clear previous timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setScanStatus('scanning');
    setScanProgress(0);
    setScanResults(null);
    let progress = 0;

    toast({ title: 'SEO Analysis Started', description: `Simulating analysis for ${formattedUrl}...` });

    // Simulate progress
    intervalRef.current = setInterval(() => {
      progress += Math.random() * 15 + 5; // Random progress increment
      setScanProgress(Math.min(progress, 100));
      if (progress >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Don't set completed here, wait for timeout
      }
    }, 300);

    // Simulate completion
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current); // Ensure interval is cleared
      const results = generateMockSeoResults(formattedUrl);
      setScanResults(results);
      setScanStatus('completed');
      toast({
        title: 'Analysis Complete',
        description: `SEO analysis for ${results.url} finished. Overall Score (Simulated): ${results.overallScore || 'N/A'}/100`,
      });
    }, 4000); // Simulate 4 second scan time
  };

  const getStatusBadge = (status: SeoStatus) => {
    const config = statusMap[status];
    if (!config) return <Badge variant="secondary">Unknown</Badge>;
    const Icon = config.icon;
    return (
      <Badge className={cn("flex items-center gap-1 whitespace-nowrap text-xs py-0.5 px-2", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleDownloadReport = () => {
    if (!scanResults) {
      toast({ title: 'No Results', description: 'Please run an analysis first.', variant: 'destructive' });
      return;
    }

    let reportContent = `SEO Analysis Report for: ${scanResults.url}\n`;
    reportContent += `Overall Score (Simulated): ${scanResults.overallScore || 'N/A'}/100\n`;
    reportContent += `Analysis Date: ${new Date().toLocaleDateString()}\n`;
    reportContent += `============================================\n\n`;

    Object.entries(scanResults.categories).forEach(([categoryName, findings]) => {
      reportContent += `Category: ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}\n`;
      reportContent += `--------------------------------------------\n`;
      if (findings.length === 0) {
        reportContent += `No specific findings in this category.\n`;
      } else {
        findings.forEach(finding => {
          reportContent += `ID: ${finding.id}\n`;
          reportContent += `Check: ${finding.check}\n`;
          reportContent += `Status: ${finding.status}\n`;
          const detailsText = typeof finding.details === 'string' ? finding.details : 'Complex details - view in UI';
          reportContent += `Details: ${detailsText}\n`;
          if (finding.elementSelector) {
            reportContent += `Element: ${finding.elementSelector}\n`;
          }
          if (finding.recommendation) {
            reportContent += `Recommendation: ${finding.recommendation}\n`;
          }
          reportContent += `\n`;
        });
      }
      reportContent += `--------------------------------------------\n\n`;
    });

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const urlHostname = new URL(scanResults.url).hostname;
    link.download = `SEO_Report_${urlHostname.replace(/\./g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({ title: 'Report Downloaded', description: 'SEO analysis report saved as a text file.' });
  };


  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="ml-2 text-muted-foreground">Loading SEO Tester...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Scan Configuration Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><Search className="mr-2 h-5 w-5 text-accent" /> SEO Analyzer</CardTitle>
          <CardDescription>Enter the URL of the page you want to analyze for SEO issues (simulated analysis).</CardDescription>
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
            <Button onClick={simulateScan} disabled={scanStatus === 'scanning' || !scanUrl} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              {scanStatus === 'scanning' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {scanStatus === 'scanning' ? 'Analyzing...' : 'Analyze Page'}
            </Button>
          </div>
          {scanStatus === 'scanning' && (
            <div className="mt-4 space-y-1">
              <Progress value={scanProgress} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">Simulating analysis... {scanProgress.toFixed(0)}%</p>
            </div>
          )}
          {scanStatus === 'error' && <p className="text-sm text-destructive text-center mt-4">Analysis failed. Please try again.</p>}
        </CardContent>
      </Card>

      {/* Scan Results Card */}
      <Card className="shadow-lg min-h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><FileText className="mr-2 h-5 w-5 text-accent" /> Analysis Results</CardTitle>
          <CardDescription>Review the findings from the simulated SEO analysis.</CardDescription>
          {scanStatus === 'completed' && scanResults?.overallScore && (
            <div className="mt-3 flex items-center gap-2">
                <span className="font-semibold text-lg text-foreground">Overall Score (Simulated):</span>
                <span className={cn("font-bold text-2xl",
                    scanResults.overallScore >= 90 ? "text-green-600" :
                    scanResults.overallScore >= 70 ? "text-yellow-600" :
                    "text-red-600"
                )}>
                    {scanResults.overallScore}/100
                </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-grow">
          {scanStatus === 'idle' && !scanResults && (
            <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg h-full flex flex-col justify-center items-center">
              <Search className="mx-auto h-12 w-12 mb-4" />
              <p>Enter a URL and click 'Analyze Page' to see the results.</p>
            </div>
          )}
          {scanStatus === 'scanning' && (
            <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg h-full flex flex-col justify-center items-center">
              <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin text-accent" />
              <p>Analysis in progress...</p>
            </div>
          )}
          {scanStatus === 'completed' && scanResults && (
            <Tabs defaultValue="onPage" className="w-full flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                <TabsTrigger value="onPage">On-Page</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="mobile">Mobile</TabsTrigger>
              </TabsList>
              {Object.entries(scanResults.categories).map(([categoryKey, findings]) => (
                <TabsContent key={categoryKey} value={categoryKey} className="mt-4 flex-grow">
                  <ScrollArea className="h-[450px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead>Check</TableHead>
                          <TableHead>Details / Location</TableHead> {/* Updated Header */}
                          <TableHead>Recommendation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {findings.map((finding) => (
                          <TableRow key={finding.id}>
                            <TableCell>{getStatusBadge(finding.status)}</TableCell>
                            <TableCell className="font-medium">{finding.check}</TableCell>
                            <TableCell className="text-sm">
                                {finding.details}
                                {finding.elementSelector && (
                                     <span className="ml-2 text-xs font-mono bg-muted px-1 py-0.5 rounded inline-flex items-center">
                                         <Code size={12} className="mr-1"/> {finding.elementSelector}
                                     </span>
                                )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{finding.recommendation || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {findings.length === 0 && (
                      <div className="text-center p-4 text-muted-foreground">No findings in this category.</div>
                    )}
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          )}
          {scanStatus === 'error' && (
            <div className="text-center text-destructive p-6 border border-dashed border-destructive rounded-lg h-full flex flex-col justify-center items-center">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
              <p>An error occurred during the analysis simulation.</p>
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
    </div>
  );
}

