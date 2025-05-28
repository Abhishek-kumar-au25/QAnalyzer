
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, KeyRound, UserCheck, Code, ShieldAlert, Network, FileLock, BookOpen, Repeat, Construction, ScanLine, Puzzle, AlertTriangle, Loader2, Target, Server, FileCode, Bug, ListChecks } from "lucide-react";
import Image from "next/image";
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { SecurityScanResults, type ScanFinding } from '@/components/feature/security-testing/security-scan-results';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox'; 
import { ScrollArea } from '@/components/ui/scroll-area'; 

type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';
type AuditStatus = 'idle' | 'auditing' | 'completed' | 'error';

interface SecurityCheckCategory {
    name: string;
    icon: React.ElementType;
    description: string;
    checks: {
        id: string;
        name: string;
        details: string;
        tools?: string;
    }[];
}

const securityCategories: SecurityCheckCategory[] = [
    {
        name: "Authentication Testing",
        icon: KeyRound,
        description: "Verify user identity and access control.",
        checks: [
            { id: "auth-valid-invalid", name: "Valid/Invalid Credentials", details: "Test login with correct and incorrect username/password combinations." },
            { id: "auth-brute-force", name: "Brute-Force Protection", details: "Check for CAPTCHA, account lockout, or rate limiting after multiple failed login attempts." },
            { id: "auth-password-policy", name: "Strong Password Policy", details: "Ensure the system enforces strong password requirements (length, complexity)." },
            { id: "auth-mfa", name: "Multi-Factor Authentication (MFA)", details: "Validate MFA setup, code delivery, and verification (if applicable)." },
            { id: "auth-session-timeout", name: "Session Timeout & Re-auth", details: "Verify sessions expire after inactivity and require re-authentication." },
        ]
    },
    {
        name: "Authorization Testing",
        icon: UserCheck,
        description: "Ensure users can only access what they are permitted to.",
        checks: [
            { id: "authz-role-based", name: "Role-Based Access", details: "Confirm users cannot access modules/pages restricted to other roles." },
            { id: "authz-direct-url", name: "Direct URL Access", details: "Test bypassing UI to access protected routes directly via URL manipulation." },
            { id: "authz-permission-scoping", name: "Permission Scoping", details: "Validate different permission levels (e.g., Admin vs. Regular User features)." },
        ]
    },
    {
        name: "Input Validation & Injection",
        icon: Code,
        description: "Test for vulnerabilities arising from unsanitized user inputs.",
        checks: [
            { id: "inject-sql", name: "SQL Injection", details: "Attempt to inject SQL commands into input fields." },
            { id: "inject-xss", name: "Cross-Site Scripting (XSS)", details: "Test for reflected, stored, and DOM-based XSS vulnerabilities." },
            { id: "inject-command", name: "Command Injection", details: "Try to execute system commands via input fields." },
            { id: "inject-file-upload", name: "File Upload Vulnerabilities", details: "Test uploading malicious files (e.g., .php as .jpg), large files, etc." },
        ]
    },
    {
        name: "Session Management",
        icon: ShieldAlert,
        description: "Verify secure handling of user sessions.",
        checks: [
            { id: "session-fixation", name: "Session Fixation/Hijacking", details: "Test if session identifiers are guessable or can be stolen." },
            { id: "session-cookies", name: "Secure Cookies", details: "Ensure cookies use HttpOnly, Secure, and SameSite attributes." },
            { id: "session-logout", name: "Logout Invalidation", details: "Confirm that logging out properly invalidates the session on the server." },
        ]
    },
    {
        name: "Cross-Site Request Forgery (CSRF)",
        icon: Repeat,
        description: "Prevent attackers from tricking users into performing unintended actions.",
        checks: [
            { id: "csrf-tokens", name: "CSRF Token Validation", details: "Ensure anti-CSRF tokens are present and validated on all state-changing forms." },
        ]
    },
    {
        name: "API Security",
        icon: Network,
        description: "Test the security of backend APIs.",
        checks: [
            { id: "api-auth-headers", name: "API Authentication Headers", details: "Verify APIs require and validate auth tokens (Bearer, API Key)." },
            { id: "api-rate-limiting", name: "API Rate Limiting", details: "Check for protection against excessive API requests." },
            { id: "api-data-exposure", name: "API Data Exposure", details: "Ensure APIs don't leak sensitive info in responses." },
            { id: "api-bola", name: "Broken Object-Level Authorization (BOLA)", details: "Test if users can access resources they shouldn't by manipulating IDs." },
        ]
    },
    {
        name: "Security Headers",
        icon: ShieldCheck,
        description: "Ensure proper HTTP security headers are configured.",
        checks: [
            { id: "header-csp", name: "Content-Security-Policy", details: "Verify CSP header is present and properly configured." },
            { id: "header-xcto", name: "X-Content-Type-Options", details: "Ensure 'nosniff' is set." },
            { id: "header-xfo", name: "X-Frame-Options", details: "Check for 'DENY' or 'SAMEORIGIN' to prevent clickjacking." },
            { id: "header-hsts", name: "Strict-Transport-Security", details: "Verify HSTS header is present to enforce HTTPS." },
            { id: "header-referrer", name: "Referrer-Policy", details: "Check for a restrictive Referrer-Policy." },
        ]
    },
    {
        name: "File Security",
        icon: FileLock,
        description: "Secure handling of file uploads and access.",
        checks: [
            { id: "file-type-restrict", name: "File Type Restriction", details: "Ensure only allowed file types can be uploaded." },
            { id: "file-malware-scan", name: "Malware Scanning (Integration)", details: "If integrated, verify uploaded files are scanned for malware." },
            { id: "file-path-traversal", name: "Path Traversal Prevention", details: "Test for attempts to access unauthorized files/directories." },
        ]
    },
    {
        name: "Logging & Monitoring",
        icon: BookOpen,
        description: "Ensure adequate logging and monitoring for security events.",
        checks: [
            { id: "log-critical-actions", name: "Critical Action Logging", details: "Verify logs for login, password changes, data export, etc." },
            { id: "log-sensitive-data", name: "No Sensitive Data in Logs", details: "Ensure logs do not contain passwords or other sensitive information." },
            { id: "log-ids", name: "Intrusion Detection (Integration)", details: "Confirm if IDS/IPS mechanisms are active and logging alerts." },
        ]
    },
];

type ChecklistState = Record<string, boolean>;

const initialChecklistState = securityCategories.reduce((acc, category) => {
    category.checks.forEach(check => {
        acc[check.id] = false;
    });
    return acc;
}, {} as ChecklistState);


const generateMockFindings = (isAudit: boolean = false): ScanFinding[] => {
    const findings: ScanFinding[] = [];
    const numFindings = Math.floor(Math.random() * 5) + 1; 

    const vulnTypes = ['SQL Injection', 'Cross-Site Scripting (XSS)', 'Missing Security Header', 'Server Version Exposed', 'Insecure Cookie', 'CSRF Potential', 'Directory Traversal', 'Open Redirect'];
    const auditTypes = ['Outdated Dependency', 'Dependency Vulnerability', 'License Compliance Issue'];
    const severities: ScanFinding['severity'][] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
    const locations = ['/login', '/search?q=<script>', 'All Pages', 'HTTP Headers', 'Set-Cookie Header', '/profile/update', '/static/files', '/redirect?url=evil.com', 'package.json', 'node_modules/request', 'LICENSE'];
    const selectors = ['input[name="username"]', '#search-results', 'N/A', 'Server Header', 'sessionid', 'form#profile-form', 'a.file-link', 'a.external-link', 'package.json', 'N/A', 'LICENSE'];
    const descriptions = [
        'Potential SQL Injection vulnerability detected in login form parameter.',
        'Reflected XSS possible via search query parameter.',
        'X-Content-Type-Options header not set.',
        'Server version revealed in HTTP headers.',
        'Session cookie lacks HttpOnly or Secure flag.',
        'Profile update form may be vulnerable to CSRF without token validation.',
        'File link allows potential directory traversal.',
        'Redirect URL parameter is not validated, possible open redirect.',
        'Package has known critical vulnerabilities.',
        'Dependency contains moderate severity vulnerabilities.',
        'Dependency uses a non-permissive license (e.g., GPL).',
    ];
    const recommendations = [
        'Use parameterized queries or prepared statements. Sanitize input.',
        'Sanitize user input and use appropriate output encoding (e.g., Content Security Policy).',
        'Set X-Content-Type-Options header to "nosniff".',
        'Configure server to hide or obfuscate version information.',
        'Ensure session cookies use HttpOnly, Secure, and SameSite attributes.',
        'Implement and validate anti-CSRF tokens for all state-changing requests.',
        'Validate and sanitize file paths before accessing filesystem.',
        'Validate redirect URLs against an allowlist or ensure they are relative.',
        'Update package to the latest patched version.',
        'Consider migrating to an alternative package or update if patch available.',
        'Review license compliance or replace dependency with permissively licensed alternative.',
    ];
     const logSnippets = [
        `WARN: SQL query executed with unsanitized input: SELECT * FROM users WHERE username = '{INPUT}'`,
        `INFO: Rendering search results for query: <script>alert(1)</script>`,
        `DEBUG: Response headers missing X-Content-Type-Options`,
        `DEBUG: Server header: Apache/2.4.5 (Unix)`,
        `DEBUG: Set-Cookie: sessionid=xyz123; Path=/`,
        `INFO: Received POST /profile/update without CSRF token`,
        `ERROR: Filesystem access attempt: /static/files/../../passwd`,
        `INFO: Redirecting to URL: evil.com`,
        `AUDIT: Found critical vulnerability CVE-XXXX-YYYY in left-pad@1.1.0`,
        `AUDIT: Found moderate vulnerability in request@2.88.0`,
        `AUDIT: Found GPL license in dependency 'restricted-lib'`,
    ];
    const steps = [
        ['Submit `\' OR \'1\'=\'1` in the username field.', 'Observe if login succeeds without valid password.'],
        ['Navigate to `/search?q=<img src=x onerror=alert(1)>`', 'Check if an alert box appears.'],
        ['Inspect response headers using browser DevTools.', 'Verify absence of `X-Content-Type-Options`.'],
        ['Inspect response headers using `curl -I {URL}` or DevTools.', 'Note the `Server` header value.'],
        ['Inspect cookies in browser DevTools.', 'Check flags for the session cookie.'],
        ['Submit the profile update form from a different origin (use a tool like Burp).', 'Verify if the update succeeds.'],
        ['Attempt to access a file link like `/static/files/download?file=../../config.txt`', 'Check if sensitive file content is returned.'],
        ['Navigate to `/redirect?url=http://malicious-site.com`', 'Verify if the browser redirects to the external site.'],
        ['Run `npm audit` or check vulnerability database for the package version.', 'Note the reported CVEs.'],
        ['Run `npm audit fix` or manually update `package.json`.', 'Re-run audit to confirm fix.'],
        ['Check dependency license using tools like `license-checker`.', 'Consult legal advice if necessary.'],
    ];


    for (let i = 0; i < numFindings; i++) {
        const typeIndex = Math.floor(Math.random() * (isAudit ? auditTypes.length : vulnTypes.length));
        const sevIndex = Math.floor(Math.random() * severities.length);
        const locIndex = Math.floor(Math.random() * locations.length);
        const selIndex = Math.floor(Math.random() * selectors.length);
        const descIndex = Math.floor(Math.random() * descriptions.length);
        const recIndex = Math.floor(Math.random() * recommendations.length);
        const logIndex = Math.floor(Math.random() * logSnippets.length);
        const stepIndex = Math.floor(Math.random() * steps.length);


        findings.push({
            id: `${isAudit ? 'dep' : 'vuln'}-${i + 1}-${Math.random().toString(16).slice(2, 8)}`,
            severity: severities[sevIndex],
            type: isAudit ? auditTypes[typeIndex] : vulnTypes[typeIndex],
            description: descriptions[descIndex % descriptions.length], 
            recommendation: recommendations[recIndex % recommendations.length],
            location: locations[locIndex % locations.length],
            elementSelector: Math.random() > 0.5 ? selectors[selIndex % selectors.length] : undefined,
            logSnippet: Math.random() > 0.4 ? logSnippets[logIndex % logSnippets.length] : undefined,
            stepsToReproduce: Math.random() > 0.3 ? steps[stepIndex % steps.length] : undefined,
        });
    }
    return findings;
};


export default function SecurityTestingPage() {
  const [scanUrl, setScanUrl] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<ScanFinding[]>([]);
  const [auditStatus, setAuditStatus] = useState<AuditStatus>('idle');
  const [auditResults, setAuditResults] = useState<{ summary: string, details?: ScanFinding[] } | null>(null);
  const [checklistState, setChecklistState] = useState<ChecklistState>(initialChecklistState);
  const [selectAllChecked, setSelectAllChecked] = useState<boolean | 'indeterminate'>(false);


  const { toast } = useToast();
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const auditTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        if (auditTimeoutRef.current) clearTimeout(auditTimeoutRef.current);
    };
  }, []);

  // Update "Select All" checkbox state
  useEffect(() => {
    const allCheckIds = securityCategories.flatMap(cat => cat.checks.map(ch => ch.id));
    const allChecked = allCheckIds.every(id => checklistState[id]);
    const someChecked = allCheckIds.some(id => checklistState[id]);

    if (allChecked) {
        setSelectAllChecked(true);
    } else if (someChecked) {
        setSelectAllChecked('indeterminate');
    } else {
        setSelectAllChecked(false);
    }
  }, [checklistState]);

  const handleChecklistChange = (id: string, checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
        setChecklistState(prev => ({ ...prev, [id]: checked }));
    }
  };

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
        const newChecklistState: ChecklistState = {};
        securityCategories.forEach(category => {
            category.checks.forEach(check => {
                newChecklistState[check.id] = checked;
            });
        });
        setChecklistState(newChecklistState);
        setSelectAllChecked(checked); // Directly set the Select All state
    }
    // For indeterminate, it's driven by individual items, so no action here
  };

  const simulateScan = async () => {
    if (!scanUrl) {
      toast({ title: 'URL Required', description: 'Please enter a URL to scan.', variant: 'destructive' });
      return;
    }
     if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    setScanStatus('scanning');
    setScanProgress(0);
    setScanResults([]);
    let progress = 0;

    scanIntervalRef.current = setInterval(() => {
      progress += Math.random() * 15 + 5;
      setScanProgress(Math.min(progress, 100));
      if (progress >= 100) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setScanStatus('completed');
        const mockScanResults = generateMockFindings(false);
        setScanResults(mockScanResults);
        toast({ title: 'Scan Complete', description: `Found ${mockScanResults.length} potential issues.` });
      }
    }, 500);
  };

  const simulateAudit = async () => {
    if (auditTimeoutRef.current) clearTimeout(auditTimeoutRef.current);

    setAuditStatus('auditing');
    setAuditResults(null);

    auditTimeoutRef.current = setTimeout(() => { 
        setAuditStatus('completed');
        const mockAuditFindings = generateMockFindings(true);
        const highCount = mockAuditFindings.filter(f => f.severity === 'High' || f.severity === 'Critical').length;
        const medCount = mockAuditFindings.filter(f => f.severity === 'Medium').length;
        const summary = `Found ${mockAuditFindings.length} issues (${highCount} High/Critical, ${medCount} Medium).`;

        setAuditResults({
            summary: summary,
            details: mockAuditFindings,
        });
        toast({ title: 'Dependency Audit Complete', description: summary });
    }, 3000);
  };


  return (
    <div className="container mx-auto py-8 space-y-8">

       <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center"><ScanLine className="mr-2 h-5 w-5 text-accent"/>Vulnerability Scanning & Audits</CardTitle>
            <CardDescription>
              Initiate automated scans for common vulnerabilities and check dependencies (Simulated).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                <h3 className="font-semibold text-foreground flex items-center"><Target className="mr-2 h-4 w-4 text-destructive"/>Automated Vulnerability Scan</h3>
                <p className="text-sm text-muted-foreground">Scan a target URL for common web vulnerabilities (e.g., OWASP Top 10).</p>
                <div>
                    <Label htmlFor="scan-url">Target URL</Label>
                    <Input
                        id="scan-url"
                        type="url"
                        placeholder="https://example.com"
                        value={scanUrl}
                        onChange={(e) => setScanUrl(e.target.value)}
                        disabled={scanStatus === 'scanning'}
                    />
                </div>
                 {scanStatus === 'scanning' && (
                    <div className="space-y-2">
                        <Progress value={scanProgress} className="w-full" />
                        <p className="text-xs text-muted-foreground text-center">Scanning... {scanProgress.toFixed(0)}%</p>
                    </div>
                 )}
                <Button onClick={simulateScan} disabled={scanStatus === 'scanning' || !scanUrl} className="w-full">
                    {scanStatus === 'scanning' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                    {scanStatus === 'scanning' ? 'Scanning...' : 'Start Scan'}
                </Button>
                 {scanStatus === 'error' && <p className="text-sm text-destructive text-center">Scan failed. Please try again.</p>}
            </div>
             <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                <h3 className="font-semibold text-foreground flex items-center"><Puzzle className="mr-2 h-4 w-4 text-accent"/>Dependency Audit</h3>
                <p className="text-sm text-muted-foreground">Check project dependencies for known security vulnerabilities (simulated).</p>
                {auditStatus === 'auditing' && (
                    <div className="flex items-center justify-center space-x-2 py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" />
                        <p className="text-sm text-muted-foreground">Auditing dependencies...</p>
                    </div>
                 )}
                <Button onClick={simulateAudit} disabled={auditStatus === 'auditing'} className="w-full">
                    {auditStatus === 'auditing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bug className="mr-2 h-4 w-4" />}
                    {auditStatus === 'auditing' ? 'Auditing...' : 'Run Audit'}
                </Button>
                 <p className="text-xs text-muted-foreground text-center">Simulates running tools like npm audit or Snyk.</p>
                 {auditStatus === 'completed' && auditResults && (
                    <p className="text-sm text-center font-medium text-foreground mt-2">{auditResults.summary}</p>
                 )}
                 {auditStatus === 'error' && <p className="text-sm text-destructive text-center">Audit failed.</p>}
             </div>
          </CardContent>
      </Card>

        {(scanStatus === 'completed' || auditStatus === 'completed') && (
            <SecurityScanResults
                scanFindings={scanResults}
                auditFindings={auditResults?.details ?? []}
                auditSummary={auditResults?.summary}
            />
        )}
    </div>
  );
}

