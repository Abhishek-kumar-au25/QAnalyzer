
'use client'; // Page itself is client rendered due to its interactive nature

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Construction, Smartphone, Laptop, BarChart3, Chrome, Apple, CheckCircle, XCircle, Clock, PlayCircle, Loader2, AlertTriangle, Globe as GlobeIcon, Download, ListChecks, Code, FileText } from "lucide-react";
import Image from "next/image";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'; // Renamed BarChart to avoid conflict with lucide icon
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";


// Mock Data
const desktopBrowsers = [
    { value: 'chrome', label: 'Chrome', icon: Chrome },
    { value: 'firefox', label: 'Firefox', icon: GlobeIcon },
    { value: 'safari', label: 'Safari', icon: Apple },
    { value: 'edge', label: 'Edge', icon: GlobeIcon },
];
const browserVersions: Record<string, string[]> = {
    chrome: ['Latest', '125', '124', '123', '122', '120', '118', '115', '110', '100', '90'],
    firefox: ['Latest', '126', '125', '124', '123', '120', '118', '115', '110', '100', '90'],
    safari: ['Latest', '17.5', '17.4', '17', '16.5', '16', '15', '14', '13'],
    edge: ['Latest', '125', '124', '123', '122', '120', '118', '115', '110', '100', '90'],
};

const mobilePlatforms = [
    { value: 'ios', label: 'iOS', icon: Apple },
    { value: 'android', label: 'Android', icon: Smartphone },
];
const mobileVersions: Record<string, string[]> = {
    ios: ['Latest (iOS 17)', 'iOS 16', 'iOS 15', 'iOS 14', 'iOS 13'],
    android: ['Latest (Android 14)', 'Android 13', 'Android 12', 'Android 11', 'Android 10'],
};

type TestStatus = 'idle' | 'running' | 'completed' | 'error';
interface MockIssue {
    description: string;
    elementSelector?: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    stepsToReproduce?: string[];
    logSnippet?: string;
}
interface TestResult {
    browser: string;
    version: string;
    platform?: string;
    compatibility: 'Compatible' | 'Minor Issues' | 'Needs Attention';
    loadTimeMs: number;
    renderTimeMs: number;
    status: 'success' | 'failure';
    issues?: MockIssue[];
}

const chartData = [
  { browser: "Chrome", compatibility: 95, performance: 85 },
  { browser: "Firefox", compatibility: 92, performance: 88 },
  { browser: "Safari", compatibility: 88, performance: 90 },
  { browser: "Edge", compatibility: 94, performance: 86 },
  { browser: "iOS Safari", compatibility: 85, performance: 92 },
  { browser: "Android Chrome", compatibility: 93, performance: 87 },
];

const chartConfig = {
  compatibility: {
    label: "Compatibility (%)",
    color: "hsl(var(--chart-1))",
  },
  performance: {
    label: "Performance Score",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

// Simple hash function (for deterministic behavior based on URL)
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export default function CrossBrowserTestingPage() {
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedDesktopBrowser, setSelectedDesktopBrowser] = useState<string>('');
  const [selectedDesktopVersion, setSelectedDesktopVersion] = useState<string>('');
  const [selectedMobilePlatform, setSelectedMobilePlatform] = useState<string>('');
  const [selectedMobileVersion, setSelectedMobileVersion] = useState<string>('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testProgress, setTestProgress] = useState(0);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [testType, setTestType] = useState<'desktop' | 'mobile' | null>(null);
  const [lastTestConfig, setLastTestConfig] = useState<{ url: string; browser: string; version: string; platform?: string; type: 'desktop' | 'mobile' } | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

   useEffect(() => {
     if (testStatus === 'running' && lastTestConfig) {
        setTimeout(() => {
             toast({
                title: `Simulating ${lastTestConfig.type} test...`,
                description: `Testing ${lastTestConfig.url} on ${lastTestConfig.browser} ${lastTestConfig.version}${lastTestConfig.platform ? ` (${lastTestConfig.platform})` : ''}`,
            });
        }, 50);
     }
     if (testStatus === 'completed' && testResults) {
        setTimeout(() => {
            toast({
                title: `Simulated ${testType} Test Complete`,
                description: `Result: ${testResults.compatibility}${testResults.issues ? ` (${testResults.issues.length} issue(s) found)` : ''}`,
                variant: testResults.status === 'failure' ? 'destructive' : 'default'
            });
        }, 50);
     }
     if (testStatus === 'error') {
         setTimeout(() => {
            toast({
                title: 'Test Simulation Error',
                description: 'An error occurred during the test simulation.',
                variant: 'destructive',
            });
        }, 50);
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [testStatus, testResults, lastTestConfig]);

  const simulateTest = (type: 'desktop' | 'mobile') => {
     if (!targetUrl) {
        toast({ variant: 'destructive', title: 'URL Required', description: 'Please enter a URL to test.' });
        return;
    }

    const browserValue = type === 'desktop' ? selectedDesktopBrowser : selectedMobilePlatform;
    const versionValue = type === 'desktop' ? selectedDesktopVersion : selectedMobileVersion;
    const platformValue = type === 'mobile' ? selectedMobilePlatform : undefined;
    const browserLabel = type === 'desktop' ? desktopBrowsers.find(b => b.value === browserValue)?.label ?? browserValue : mobilePlatforms.find(p => p.value === platformValue)?.label ?? platformValue ?? 'Unknown';

    if (!browserValue || !versionValue) {
        toast({ variant: 'destructive', title: 'Selection Required', description: `Please select a ${type} browser/platform and version.` });
        return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setLastTestConfig({
        url: targetUrl,
        browser: browserLabel,
        version: versionValue,
        platform: platformValue ? mobilePlatforms.find(p => p.value === platformValue)?.label : undefined,
        type: type,
    });

    setTestStatus('running');
    setTestProgress(0);
    setTestResults(null);
    setTestType(type);

    intervalRef.current = setInterval(() => {
      setTestProgress((prev) => {
        const newProgress = prev + Math.random() * 15 + 10;
        if (newProgress >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 100;
        }
        return newProgress;
      });
    }, 300);

    timeoutRef.current = setTimeout(() => {
         if (intervalRef.current) clearInterval(intervalRef.current);

         setTestStatus((currentStatus) => {
            if (currentStatus !== 'running') return currentStatus;

            const urlHash = simpleHash(targetUrl + browserLabel + versionValue + (platformValue || '')); // Make hash more specific to configuration
            const compatibilityChance = (urlHash % 100) / 100.0; // Value between 0.00 and 0.99

            const compatibility: TestResult['compatibility'] =
              compatibilityChance > 0.85 ? 'Compatible' :
              compatibilityChance > 0.55 ? 'Minor Issues' : 'Needs Attention'; // Adjusted thresholds

            const loadTimeMs = Math.floor(Math.random() * 1500) + 300; // Slightly reduced randomness
            const renderTimeMs = Math.floor(Math.random() * 1000) + loadTimeMs + 50;
            const status: TestResult['status'] = compatibility === 'Compatible' ? 'success' : 'failure';

            let issues: MockIssue[] | undefined = undefined;
            const possibleIssues: MockIssue[] = [
                { description: "Layout shift detected on main banner.", elementSelector: "header > div.banner", expectedBehavior: "Banner should remain static during load.", actualBehavior: "Banner jumps down after image loads.", stepsToReproduce: ["Load page on slow 3G connection.", "Observe banner section."], logSnippet: "CLS event triggered for element: header > div.banner" },
                { description: "Button 'Submit' overlaps footer on smaller screens.", elementSelector: "button#submit-btn", expectedBehavior: "Button should be above the footer.", actualBehavior: "Button partially covers footer text on screens < 400px wide.", stepsToReproduce: ["Resize browser window to 380px width.", "Scroll to bottom of the form."], logSnippet: "Overlap detected between #submit-btn and footer" },
                { description: "Image gallery very slow to load.", elementSelector: ".product-gallery", expectedBehavior: "Gallery images should load within 3 seconds.", actualBehavior: "Gallery images take > 10 seconds to fully display.", stepsToReproduce: ["Navigate to the product gallery page.", "Measure image load time using DevTools Network tab."], logSnippet: "Network request for gallery-image-5.jpg: 7.2s" },
                { description: "Font rendering inconsistent (using system font fallback).", elementSelector: "body", expectedBehavior: "Custom webfont 'Open Sans' should be used.", actualBehavior: "System default sans-serif font rendered instead.", stepsToReproduce: ["Clear browser cache.", "Load the page and inspect body font-family style."], logSnippet: "Webfont 'Open Sans' failed to load (404)" },
                { description: "Dropdown menu partially obscured by other elements.", elementSelector: "#main-nav .dropdown", expectedBehavior: "Entire dropdown menu should be visible and on top.", actualBehavior: "Bottom part of the dropdown is cut off by a chat widget.", stepsToReproduce: ["Click on the 'Products' navigation item.", "Observe the dropdown menu and chat widget overlap."], logSnippet: "Element #main-nav .dropdown z-index conflict suspected" },
                { description: "Input field validation message not accessible.", elementSelector: "input[name='email'] + .error-message", expectedBehavior: "Error message should be announced by screen readers.", actualBehavior: "Error message is visually present but not linked via aria-describedby.", stepsToReproduce: ["Submit form with invalid email.", "Use screen reader to check error announcement."], logSnippet: "Accessibility check: input[name='email'] missing aria-describedby for error." },
                { description: "Animations cause excessive CPU usage on older devices.", elementSelector: ".hero-animation", expectedBehavior: "Animations should be smooth and not drain battery.", actualBehavior: "Animation stutters and CPU usage spikes to 80% on simulated older device.", stepsToReproduce: ["Run performance profile on hero animation.", "Observe CPU graph."], logSnippet: "Performance warning: High CPU usage during .hero-animation" },
            ];
            
            if (status === 'failure') {
                issues = [];
                const numIssuesToGenerate = compatibility === 'Needs Attention' ? 2 : 1; // More deterministic number of issues
                
                for (let i = 0; i < numIssuesToGenerate; i++) {
                    // Use hash to pick issues somewhat deterministically for the same URL config
                    const issueIndex = (urlHash + i * 3) % possibleIssues.length; 
                    const candidateIssue = possibleIssues[issueIndex];
                    if (candidateIssue && !issues.some(existing => existing.description === candidateIssue.description)) {
                        issues.push(candidateIssue);
                    }
                }
                // If not enough unique issues were picked, fill up with remaining unique issues
                if (issues.length < numIssuesToGenerate && possibleIssues.length > 0) {
                    for (const pIssue of possibleIssues) {
                        if (issues.length >= numIssuesToGenerate) break;
                        if (!issues.some(existing => existing.description === pIssue.description)) {
                            issues.push(pIssue);
                        }
                    }
                }
            }

            const result: TestResult = {
                browser: browserLabel,
                version: versionValue,
                platform: platformValue ? mobilePlatforms.find(p => p.value === platformValue)?.label : undefined,
                compatibility: compatibility,
                loadTimeMs: loadTimeMs,
                renderTimeMs: renderTimeMs,
                status: status,
                issues: issues,
            };
            setTestResults(result);
            return 'completed';
         });

    }, 4000);

  };

  const getBrowserIcon = (browserValue: string): React.ElementType => {
    const browser = desktopBrowsers.find(b => b.value === browserValue.toLowerCase());
    return browser ? browser.icon : GlobeIcon; // Default icon
  };

  const getPlatformIcon = (platformValue: string) : React.ElementType => {
     const platform = mobilePlatforms.find(p => p.value === platformValue.toLowerCase());
     return platform ? platform.icon : Smartphone; // Default icon
  }

  const getDesktopButtonText = () => {
    if (testStatus === 'running' && testType === 'desktop') {
      return 'Running Test...';
    }
    if (selectedDesktopBrowser && selectedDesktopVersion) {
      const browserLabel = desktopBrowsers.find(b => b.value === selectedDesktopBrowser)?.label ?? selectedDesktopBrowser;
      const IconComponent = getBrowserIcon(selectedDesktopBrowser);
      return (
         <span className="flex items-center">
             <PlayCircle className="mr-2 h-4 w-4" /> Test on
             {IconComponent && <IconComponent className="ml-2 mr-1 h-4 w-4" />}
             {browserLabel} {selectedDesktopVersion}
         </span>
      );
    }
    return (
        <>
            <PlayCircle className="mr-2 h-4 w-4" /> Start Desktop Test
        </>
    );
  };

  const getMobileButtonText = () => {
      if (testStatus === 'running' && testType === 'mobile') {
        return 'Running Test...';
      }
      if (selectedMobilePlatform && selectedMobileVersion) {
        const platformLabel = mobilePlatforms.find(p => p.value === selectedMobilePlatform)?.label ?? selectedMobilePlatform;
        const IconComponent = getPlatformIcon(selectedMobilePlatform);
         return (
             <span className="flex items-center">
                 <PlayCircle className="mr-2 h-4 w-4" /> Test on
                 {IconComponent && <IconComponent className="ml-2 mr-1 h-4 w-4" />}
                 {platformLabel} {selectedMobileVersion}
             </span>
          );
      }
       return (
            <>
                <PlayCircle className="mr-2 h-4 w-4" /> Start Mobile Test
            </>
        );
    };

    const handleDownloadReport = () => {
        if (!testResults || !lastTestConfig) {
            toast({ variant: 'destructive', title: 'No Results', description: 'Cannot download report, no test results available.' });
            return;
        }

        let reportContent = `Cross-Browser Test Report\n`;
        reportContent += `=============================\n\n`;
        reportContent += `Test Configuration:\n`;
        reportContent += `  URL Tested: ${lastTestConfig.url}\n`;
        reportContent += `  Test Type: ${lastTestConfig.type}\n`;
        reportContent += `  Browser/Platform: ${lastTestConfig.browser}\n`;
        reportContent += `  Version: ${lastTestConfig.version}\n`;
        if (lastTestConfig.platform) {
            reportContent += `  Platform Detail: ${lastTestConfig.platform}\n`;
        }
        reportContent += `-----------------------------\n`;
        reportContent += `Test Summary:\n`;
        reportContent += `  Status: ${testResults.status === 'success' ? 'Passed' : 'Issues Found'}\n`;
        reportContent += `  Compatibility Rating: ${testResults.compatibility}\n`;
        reportContent += `  Simulated Load Time: ${testResults.loadTimeMs} ms\n`;
        reportContent += `  Simulated Render Time: ${testResults.renderTimeMs} ms\n\n`;

        if (testResults.issues && testResults.issues.length > 0) {
            reportContent += `Identified Issues (${testResults.issues.length}):\n`;
            reportContent += `=============================\n`;
            testResults.issues.forEach((issue, index) => {
                reportContent += `Issue #${index + 1}:\n`;
                reportContent += `  Description: ${issue.description}\n`;
                if (issue.elementSelector) {
                    reportContent += `  Element Selector: ${issue.elementSelector}\n`;
                }
                if (issue.expectedBehavior) {
                    reportContent += `  Expected Behavior: ${issue.expectedBehavior}\n`;
                }
                if (issue.actualBehavior) {
                    reportContent += `  Actual Behavior: ${issue.actualBehavior}\n`;
                }
                 if (issue.stepsToReproduce && issue.stepsToReproduce.length > 0) {
                    reportContent += `  Steps to Reproduce:\n`;
                    issue.stepsToReproduce.forEach((step, stepIndex) => {
                        reportContent += `    ${stepIndex + 1}. ${step}\n`;
                    });
                }
                if (issue.logSnippet) {
                    reportContent += `  Log Snippet:\n    ${issue.logSnippet}\n`;
                }
                reportContent += `-----------------------------\n`;
            });
        } else if (testResults.status === 'failure') {
             reportContent += `Identified Issues: None specified in simulation.\n`;
        } else {
             reportContent += `Identified Issues: None\n`;
        }
        reportContent += `\nNote: This report uses simulated data. Actual issues may vary.\n`;


        const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `CrossBrowserTestReport_${lastTestConfig.browser.replace(/ /g, '_')}_${lastTestConfig.version.replace(/ /g, '_')}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        toast({ title: 'Report Downloaded', description: 'Test report saved as a text file.' });
    };

    if (!isClient) {
     return (
       <div className="flex items-center justify-center h-64">
         <Loader2 className="h-8 w-8 animate-spin text-accent" />
         <p className="ml-2 text-muted-foreground">Loading Cross Browser Tester...</p>
       </div>
     );
   }


  return (
    <div className="container mx-auto py-8 space-y-8">

      {/* Configuration Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><GlobeIcon className="mr-2 h-5 w-5 text-accent"/>Cross Browser Test Setup</CardTitle>
          <CardDescription>Configure the URL and browser/platform combinations for testing (simulated).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
              <Label htmlFor="target-url">Website URL</Label>
              <Input
                  id="target-url"
                  type="url"
                  placeholder="https://example.com"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  disabled={testStatus === 'running'}
              />
          </div>

          {/* Desktop Browser Configuration */}
          <div className="border p-4 rounded-lg bg-muted/20 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center"><Laptop className="mr-2 h-5 w-5"/>Desktop Browser Testing</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                   <div>
                      <Label htmlFor="desktop-browser-select">Browser</Label>
                      <Select onValueChange={setSelectedDesktopBrowser} value={selectedDesktopBrowser} disabled={testStatus === 'running'}>
                        <SelectTrigger id="desktop-browser-select">
                            <SelectValue placeholder="Select Browser" />
                        </SelectTrigger>
                        <SelectContent>
                            {desktopBrowsers.map((browser) => {
                                const Icon = browser.icon;
                                return (
                                    <SelectItem key={browser.value} value={browser.value}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground"/> {browser.label}
                                    </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                      </Select>
                   </div>
                   <div>
                      <Label htmlFor="desktop-version-select">Version</Label>
                      <Select onValueChange={setSelectedDesktopVersion} value={selectedDesktopVersion} disabled={!selectedDesktopBrowser || testStatus === 'running'}>
                        <SelectTrigger id="desktop-version-select">
                            <SelectValue placeholder="Select Version" />
                        </SelectTrigger>
                        <SelectContent>
                            {(browserVersions[selectedDesktopBrowser] || []).map((version) => (
                                <SelectItem key={version} value={version}>{version}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                   </div>
              </div>
              <Button onClick={() => simulateTest('desktop')} disabled={testStatus === 'running' || !selectedDesktopBrowser || !selectedDesktopVersion || !targetUrl} className="w-full sm:w-auto">
                  {testStatus === 'running' && testType === 'desktop' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {getDesktopButtonText()}
              </Button>
          </div>

          {/* Mobile Browser Configuration */}
          <div className="border p-4 rounded-lg bg-muted/20 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center"><Smartphone className="mr-2 h-5 w-5"/>Mobile Browser Testing</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                   <div>
                      <Label htmlFor="mobile-platform-select">Platform</Label>
                       <Select onValueChange={setSelectedMobilePlatform} value={selectedMobilePlatform} disabled={testStatus === 'running'}>
                        <SelectTrigger id="mobile-platform-select">
                            <SelectValue placeholder="Select Platform" />
                        </SelectTrigger>
                        <SelectContent>
                            {mobilePlatforms.map((platform) => {
                                const Icon = platform.icon;
                                return (
                                    <SelectItem key={platform.value} value={platform.value}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground"/> {platform.label}
                                    </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                      </Select>
                   </div>
                    <div>
                      <Label htmlFor="mobile-version-select">OS / Browser Version</Label>
                      <Select onValueChange={setSelectedMobileVersion} value={selectedMobileVersion} disabled={!selectedMobilePlatform || testStatus === 'running'}>
                        <SelectTrigger id="mobile-version-select">
                            <SelectValue placeholder="Select Version" />
                        </SelectTrigger>
                        <SelectContent>
                            {(mobileVersions[selectedMobilePlatform] || []).map((version) => (
                                <SelectItem key={version} value={version}>{version}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                   </div>
              </div>
               <Button onClick={() => simulateTest('mobile')} disabled={testStatus === 'running' || !selectedMobilePlatform || !selectedMobileVersion || !targetUrl} className="w-full sm:w-auto">
                  {testStatus === 'running' && testType === 'mobile' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {getMobileButtonText()}
              </Button>
          </div>

           {testStatus === 'running' && (
             <div className="space-y-1 pt-4">
                 <Progress value={testProgress} className="w-full" />
                 <p className="text-xs text-muted-foreground text-center">Simulating test ({testType})... {testProgress.toFixed(0)}%</p>
             </div>
           )}

        </CardContent>
      </Card>

      {/* Results Card */}
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-primary flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-accent"/>Test Results Summary</CardTitle>
            <CardDescription>View the results of the latest simulated test run.</CardDescription>
        </CardHeader>
        <CardContent>
            {testStatus === 'idle' && !testResults && (
                 <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
                    <Construction className="mx-auto h-10 w-10 mb-2" />
                    <p>Run a test to see the results here.</p>
                 </div>
            )}
             {testStatus === 'running' && (
                 <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
                    <Loader2 className="mx-auto h-10 w-10 mb-2 animate-spin text-accent" />
                    <p>Test in progress...</p>
                 </div>
            )}
            {testStatus === 'completed' && testResults && (() => {
                const IconComponent = testResults.platform
                                    ? getPlatformIcon(testResults.platform === 'iOS' ? 'ios' : 'android')
                                    : getBrowserIcon(testResults.browser.toLowerCase());
                return (
                    <div className={cn("border rounded-lg p-4", testResults.status === 'failure' ? 'border-destructive bg-destructive/10' : 'border-green-500 bg-green-500/10')}>
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-3">
                            <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                                {IconComponent && <IconComponent className="h-5 w-5" />}
                                {testResults.browser} {testResults.version} {testResults.platform ? `(${testResults.platform})` : ''}
                            </h3>
                            {testResults.status === 'success' ? (
                                <span className="flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400"><CheckCircle className="h-4 w-4"/> Test Passed</span>
                            ) : (
                                <span className="flex items-center gap-1 text-sm font-medium text-destructive"><XCircle className="h-4 w-4"/> Issues Found</span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                                <p className="text-muted-foreground">Compatibility:</p>
                                <p className={cn("font-medium", testResults.compatibility === 'Needs Attention' ? 'text-destructive' : testResults.compatibility === 'Minor Issues' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-700 dark:text-green-400')}>
                                {testResults.compatibility}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Simulated Load Time:</p>
                                <p className="font-medium text-foreground">{testResults.loadTimeMs} ms</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Simulated Render Time:</p>
                                <p className="font-medium text-foreground">{testResults.renderTimeMs} ms</p>
                            </div>
                        </div>

                        {testResults.issues && testResults.issues.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-dashed border-destructive/50">
                                <h4 className="font-semibold text-destructive flex items-center mb-2"><ListChecks className="mr-2 h-4 w-4"/>Detailed Issues Found:</h4>
                                <ul className="space-y-3">
                                    {testResults.issues.map((issue, index) => (
                                        <li key={index} className="text-sm border-l-4 border-destructive/50 pl-3 py-1 bg-destructive/5 rounded">
                                            <p className="font-medium text-foreground">{issue.description}</p>
                                            {issue.elementSelector && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    <span className="font-semibold">Element:</span>
                                                    <code className="ml-1 bg-muted px-1 py-0.5 rounded inline-flex items-center"><Code size={12} className="mr-1"/>{issue.elementSelector}</code>
                                                </p>
                                            )}
                                            {issue.expectedBehavior && <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold">Expected:</span> {issue.expectedBehavior}</p>}
                                            {issue.actualBehavior && <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold">Actual:</span> {issue.actualBehavior}</p>}
                                            {issue.stepsToReproduce && issue.stepsToReproduce.length > 0 && (
                                                <div className="mt-1">
                                                    <p className="text-xs font-semibold text-muted-foreground">Steps to Reproduce:</p>
                                                    <ol className="list-decimal list-inside text-xs text-muted-foreground pl-4">
                                                        {issue.stepsToReproduce.map((step, i) => <li key={i}>{step}</li>)}
                                                    </ol>
                                                </div>
                                            )}
                                            {issue.logSnippet && (
                                                 <p className="mt-1 text-xs text-muted-foreground">
                                                    <span className="font-semibold">Log Snippet:</span>
                                                    <code className="ml-1 block text-[10px] bg-muted p-1 rounded font-mono">{issue.logSnippet}</code>
                                                 </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                         <div className="mt-4 flex justify-end">
                            <Button onClick={handleDownloadReport} variant="outline" size="sm" disabled={!testResults || !lastTestConfig}>
                                <FileText className="mr-2 h-4 w-4" /> Download Full Report
                            </Button>
                        </div>
                    </div>
                );
            })()}
             {testStatus === 'error' && (
                 <div className="text-center text-destructive p-6 border border-dashed border-destructive rounded-lg">
                    <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                    <p>An error occurred during the test simulation.</p>
                 </div>
            )}
        </CardContent>
      </Card>

        {/* Overall Status Chart */}
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-primary flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-accent"/>Overall Compatibility & Performance</CardTitle>
                <CardDescription>Simulated overview across common browser/platform combinations.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                {typeof RechartsBarChart !== 'undefined' ? (
                     <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="browser" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="dot" hideLabel />}
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="compatibility" fill="var(--color-compatibility)" radius={4} />
                                <Bar dataKey="performance" fill="var(--color-performance)" radius={4} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                     <div className="h-[250px] flex items-center justify-center bg-muted rounded-md">
                         <Image
                            src="https://placehold.co/500x250.png"
                            alt="Overall status chart placeholder"
                            width={500}
                            height={250}
                            className="rounded-lg shadow-sm opacity-70"
                            data-ai-hint="bar chart browser"
                        />
                        <p className="absolute text-muted-foreground">Chart Placeholder</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground font-semibold">Note: This chart displays simulated demonstration data and does not update based on individual test runs.</p>
            </CardFooter>
        </Card>
    </div>
  );
}


    
