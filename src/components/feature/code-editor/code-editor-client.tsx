
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Play, Trash2, FileCode, AlertTriangle, Terminal, Languages, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const supportedLanguages = [
  { value: 'javascript', label: 'JavaScript', placeholder: "// Write your JavaScript code here...\nconsole.log('Hello from QAnalyzer!');" },
  { value: 'python', label: 'Python', placeholder: "# Write your Python code here...\n# print('Hello from QAnalyzer!')" },
  { value: 'java', label: 'Java', placeholder: "// Write your Java code here...\n// public class Main {\n//   public static void main(String[] args) {\n//     System.out.println(\"Hello from QAnalyzer!\");\n//   }\n// }" },
  { value: 'csharp', label: 'C#', placeholder: "// Write your C# code here...\n// using System;\n// public class Hello {\n//   public static void Main(string[] args) {\n//     Console.WriteLine(\"Hello from QAnalyzer!\");\n//   }\n// }" },
  { value: 'cpp', label: 'C++', placeholder: "// Write your C++ code here...\n// #include <iostream>\n// int main() {\n//   std::cout << \"Hello from QAnalyzer!\" << std::endl;\n//   return 0;\n// }" },
  { value: 'go', label: 'Go', placeholder: "// Write your Go code here...\n// package main\n// import \"fmt\"\n// func main() {\n//   fmt.Println(\"Hello from QAnalyzer!\")\n// }" },
  { value: 'ruby', label: 'Ruby', placeholder: "# Write your Ruby code here...\n# puts 'Hello from QAnalyzer!'" },
  { value: 'php', label: 'PHP', placeholder: "<?php\n// Write your PHP code here...\n// echo 'Hello from QAnalyzer!';\n?>" },
];

interface ExecutionResult {
  status: string;
  time: string;
  memory: string;
  logs: string[];
}

export default function CodeEditorClient() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [code, setCode] = useState<string>(supportedLanguages.find(l => l.value === 'javascript')?.placeholder || '');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const langConfig = supportedLanguages.find(l => l.value === selectedLanguage);
    if (langConfig) {
      const previousLangConfig = supportedLanguages.find(l => code === l.placeholder);
      if (previousLangConfig && previousLangConfig.value !== selectedLanguage) {
        setCode(langConfig.placeholder);
      } else if (!code.trim() && code !== langConfig.placeholder) {
        setCode(langConfig.placeholder);
      }
    }
  }, [selectedLanguage, code]);

  const handleRunCode = async () => {
    const currentLangConfig = supportedLanguages.find(l => l.value === selectedLanguage);
    const currentLangLabel = currentLangConfig?.label || 'this language';

    setIsRunning(true);
    setExecutionResult(null); 
    const capturedLogs: string[] = [];

    const customConsole = {
      log: (...args: any[]) => capturedLogs.push(`${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`),
      error: (...args: any[]) => capturedLogs.push(`[ERROR] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`),
      warn: (...args: any[]) => capturedLogs.push(`[WARN] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`),
      info: (...args: any[]) => capturedLogs.push(`[INFO] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`),
      debug: (...args: any[]) => capturedLogs.push(`[DEBUG] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`),
    };

    let statusMessage = 'Execution Incomplete';
    let executionTime = 'N/A';
    const simulatedMemory = `${(Math.random() * 50 + 10).toFixed(3)} Mb`; // Simulated memory

    if (selectedLanguage !== 'javascript') {
      statusMessage = `Execution for ${currentLangLabel} is not yet supported.`;
      capturedLogs.push(`[INFO] ${statusMessage}`);
      toast({
        title: "Execution Not Supported",
        description: `Running ${currentLangLabel} directly in the browser requires backend integration.`,
        duration: 5000,
      });
      setExecutionResult({ status: statusMessage, time: 'N/A', memory: 'N/A', logs: capturedLogs });
      setIsRunning(false);
      return;
    }
    
    customConsole.log("[COMPILING] Simulating JavaScript compilation...");
    await new Promise(resolve => setTimeout(resolve, 200));

    customConsole.log("[RUNNING] Executing JavaScript...");
    const startTime = performance.now();

    try {
      const result = new Function('console', code)(customConsole);
      const endTime = performance.now();
      executionTime = `${((endTime - startTime) / 1000).toFixed(4)} secs`;
      
      if (result !== undefined) {
        capturedLogs.push(`[RESULT] ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
      }
      statusMessage = 'Successfully executed';
      toast({ title: "JavaScript Code Executed", description: "Check the output console." });
    } catch (error: any) {
      const endTime = performance.now();
      executionTime = `${((endTime - startTime) / 1000).toFixed(4)} secs`;
      const errorMessage = `${error.name}: ${error.message}`;
      capturedLogs.push(`[EXECUTION_ERROR] ${errorMessage}`);
      statusMessage = `Execution Error: ${errorMessage}`;
      toast({ variant: "destructive", title: "Execution Error", description: error.message });
    } finally {
      setExecutionResult({
        status: statusMessage.startsWith('Execution Error:') ? 'Execution Error' : 'Successfully executed', // Simplified status for the bar
        time: executionTime,
        memory: simulatedMemory,
        logs: capturedLogs,
      });
      setIsRunning(false);
    }
  };

  const handleClearOutput = () => {
    setExecutionResult(null);
    toast({ title: "Output Cleared" });
  };

  if (!isClient) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="ml-2 text-muted-foreground">Loading Code Editor...</p>
        </div>
    );
  }

  const currentLanguageConfig = supportedLanguages.find(l => l.value === selectedLanguage);

  return (
    <div className="flex flex-col w-full h-full p-4 space-y-4">
      <Card className="shadow-lg flex flex-col flex-grow min-h-0">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base text-primary flex items-center">
              <FileCode className="mr-2 h-5 w-5 text-accent" /> Code Input
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-48">
                <Label htmlFor="language-select" className="sr-only">Select Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger id="language-select" className="h-9">
                    <Languages className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleRunCode} 
                disabled={isRunning || !code.trim()} 
                className="h-9"
                title={selectedLanguage !== 'javascript' ? `Run ${currentLanguageConfig?.label || ''} (Backend TBD)` : 'Run JavaScript Code'}
              >
                {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {isRunning ? 'Running...' : `Run ${currentLanguageConfig?.label || 'Code'}`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow flex flex-col">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={currentLanguageConfig?.placeholder || "// Write your code here..."}
            className="flex-grow font-mono text-sm resize-none bg-muted/10 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
            spellCheck="false"
          />
        </CardContent>
      </Card>

      <Card className="shadow-lg flex flex-col h-[300px]"> {/* Adjusted height for new sections */}
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base text-primary flex items-center"><Terminal className="mr-2 h-5 w-5 text-accent" /> Output Console</CardTitle>
            <Button onClick={handleClearOutput} variant="outline" size="sm" disabled={!executionResult} className="h-8">
              <Trash2 className="mr-2 h-3 w-3" /> Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow flex flex-col">
          {executionResult && (
            <>
              <div className={cn(
                "p-2 text-sm font-medium border-b",
                executionResult.status.startsWith('Successfully') ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              )}>
                Status: {executionResult.status.startsWith('Successfully') ? 'Successfully executed' : executionResult.status.startsWith('Execution Error:') ? 'Execution Error' : executionResult.status}
              </div>
              <div className="grid grid-cols-2 gap-4 p-2 text-xs border-b text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">Time:</span> {executionResult.time}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Memory:</span> {executionResult.memory} (Simulated)
                </div>
              </div>
              <Label className="px-3 pt-2 text-xs font-semibold text-muted-foreground">Your Output:</Label>
            </>
          )}
          <ScrollArea className={cn(
            "flex-grow w-full bg-muted/10",
            !executionResult && "flex items-center justify-center" // Center placeholder if no result
          )}>
            <pre className="text-xs whitespace-pre-wrap break-all p-3 font-mono">
              {executionResult ? (
                executionResult.logs.length > 0 ? executionResult.logs.join('\n') : <span className="italic text-muted-foreground">(No output to display)</span>
              ) : (
                <span className="italic text-muted-foreground">Run code to see output and execution details.</span>
              )}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Alert variant="default" className="mt-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Execution Environment</AlertTitle>
        <AlertDescription className="text-xs">
          JavaScript code is executed directly in your browser. 
          Execution for other languages requires backend integration (feature under development).
          Execution time is approximate; memory usage is simulated.
        </AlertDescription>
      </Alert>
    </div>
  );
}
