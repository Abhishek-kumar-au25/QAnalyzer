
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Pencil, Trash2, Loader2, Info, Code, FileText } from 'lucide-react'; // Added Code, FileText
import type { GenerateTestCasesInput, GenerateTestCasesOutput, TestCase } from '@/ai/flows/generate-test-cases-flow';
import { generateTestCases } from '@/ai/flows/generate-test-cases-flow';
import Image from "next/image"; // Import Image component
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Import Accordion

// Extend TestCase type for potential richer output
interface ExtendedTestCase extends TestCase {
    logExpectation?: string; // Example: "Expect 'User logged in successfully' log entry"
    screenshotReference?: string; // Example: "Compare with 'login-success-screenshot.png'"
    elementSelector?: string; // Specific element related to the test step/result
}

const formSchema = z.object({
  featureDescription: z.string().min(10, { message: 'Feature description must be at least 10 characters long.' }),
  testCaseType: z.string().min(1, { message: 'Please select a test case type.' }),
  priority: z.string().min(1, { message: 'Please select a priority.' }),
});

type TestCaseGeneratorFormValues = z.infer<typeof formSchema>;

const testCaseTypes = ["Positive", "Negative", "Boundary Value", "Equivalence Partitioning", "Usability", "Performance", "Security", "Exploratory"];
const priorities = ["High", "Medium", "Low"];

export default function TestCaseGeneratorClient() {
  const [generatedTestCasesState, setGeneratedTestCasesState] = useState<ExtendedTestCase[]>([]); // Use ExtendedTestCase
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<TestCaseGeneratorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      featureDescription: '',
      testCaseType: '',
      priority: '',
    },
  });

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const onSubmit = async (data: TestCaseGeneratorFormValues) => {
    setIsLoading(true);
    setGeneratedTestCasesState([]);
    try {
      const input: GenerateTestCasesInput = {
        featureDescription: data.featureDescription,
        testCaseType: data.testCaseType,
        priority: data.priority,
      };
      const result: GenerateTestCasesOutput = await generateTestCases(input);

      // Simulate adding extended details (replace with actual AI logic if it provides them)
       const extendedTestCases = result.testCases.map(tc => ({
         ...tc,
         logExpectation: tc.type === 'Positive' ? `INFO: Operation ${tc.title.substring(0,10)} successful.` :
                         tc.type === 'Negative' ? `WARN: Invalid input for ${tc.title.substring(0,10)}.` :
                         undefined,
         screenshotReference: tc.type === 'Usability' ? `Compare final screen with 'usability-standard-${tc.id}.png'` : undefined,
         elementSelector: tc.steps.length > 0 && tc.steps[0].toLowerCase().includes('click') ? `button#${tc.title.split(' ')[0]}` : undefined,
       }));


      setGeneratedTestCasesState(extendedTestCases);
      toast({
        title: 'Test Cases Generated',
        description: `Successfully generated ${result.testCases.length} test case(s).`,
      });
    } catch (error) {
      console.error("Error generating test cases:", error);
      toast({
        variant: 'destructive',
        title: 'Error Generating Test Cases',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

   const handleDownloadReport = () => {
        if (generatedTestCasesState.length === 0) {
            toast({ variant: 'destructive', title: 'No Test Cases', description: 'Generate test cases first.' });
            return;
        }

        let reportContent = `Generated Test Cases Report\n`;
        reportContent += `=============================\n\n`;
        reportContent += `Feature Description:\n${form.getValues('featureDescription')}\n\n`;
        reportContent += `Requested Type: ${form.getValues('testCaseType')}\n`;
        reportContent += `Requested Priority: ${form.getValues('priority')}\n`;
        reportContent += `-----------------------------\n\n`;

        generatedTestCasesState.forEach(tc => {
            reportContent += `ID: ${tc.id}\n`;
            reportContent += `Title: ${tc.title}\n`;
            reportContent += `Type: ${tc.type}\n`;
            reportContent += `Priority: ${tc.priority}\n`;
            reportContent += `Description: ${tc.description}\n`;
            if (tc.preconditions && tc.preconditions.length > 0) {
                reportContent += `Preconditions:\n${tc.preconditions.map(p => `  - ${p}`).join('\n')}\n`;
            }
            if (tc.steps && tc.steps.length > 0) {
                reportContent += `Steps:\n${tc.steps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}\n`;
            }
            reportContent += `Expected Results: ${tc.expectedResults}\n`;
            if (tc.elementSelector) {
                reportContent += `Related Element: ${tc.elementSelector}\n`;
            }
             if (tc.logExpectation) {
                reportContent += `Log Expectation: ${tc.logExpectation}\n`;
            }
             if (tc.screenshotReference) {
                reportContent += `Screenshot Reference: ${tc.screenshotReference}\n`;
            }
            reportContent += `-----------------------------\n`;
        });

        const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const featureTitle = form.getValues('featureDescription').substring(0, 20).replace(/\s+/g, '_') || 'Feature';
        link.download = `TestCases_${featureTitle}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        toast({ title: 'Report Downloaded', description: 'Test case report saved as a text file.' });
    };


  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="ml-2 text-muted-foreground">Loading Test Case Generator...</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">Test Case Generation</CardTitle>
          <CardDescription>Provide feature details to generate test cases.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="featureDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feature Description / User Story</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., As a user, I want to be able to reset my password so that I can regain access to my account if I forget it."
                        className="min-h-[150px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="testCaseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Case Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {testCaseTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Test Cases
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="md:col-span-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">Generated Test Cases</CardTitle>
          <CardDescription>Review the test cases generated by the AI. Expand each case for details.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
                <p>Generating test cases, please wait...</p>
              </div>
            ) : generatedTestCasesState.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 border border-dashed rounded-lg">
                <Info className="h-12 w-12 text-accent mb-4" />
                <p className="text-lg font-medium">Test cases will appear here once generated.</p>
                <p className="text-sm">Fill out the form on the left and click "Generate Test Cases".</p>
              </div>
            ) : (
               <Accordion type="multiple" className="w-full space-y-3">
                {generatedTestCasesState.map((tc, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4 bg-background hover:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                       <div className="flex justify-between items-center gap-2 flex-grow mr-4">
                         <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-semibold text-foreground" title={tc.id}>{tc.id}</span>
                            <span className="text-muted-foreground text-xs truncate hidden sm:inline" title={tc.title}>{tc.title}</span>
                         </div>
                         <div className="flex items-center space-x-2 flex-shrink-0">
                             <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{tc.type}</span>
                             <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{tc.priority}</span>
                         </div>
                       </div>
                       {/* Add Edit/Delete buttons within the trigger if desired, or keep in content */}
                       {/* <div className="flex space-x-1 ml-auto">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); alert(`Edit ${tc.id}`)}}><Pencil className="h-3 w-3"/></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); alert(`Delete ${tc.id}`)}}><Trash2 className="h-3 w-3"/></Button>
                       </div> */}
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3 space-y-2 text-xs">
                       {/* Detailed Content */}
                       <p><strong className="text-muted-foreground">Title:</strong> {tc.title}</p>
                       <p><strong className="text-muted-foreground">Description:</strong> {tc.description}</p>
                       {tc.preconditions && tc.preconditions.length > 0 && (
                         <div>
                           <strong className="text-muted-foreground">Preconditions:</strong>
                           <ul className="list-disc list-inside pl-4">
                             {tc.preconditions.map((p, i) => <li key={i}>{p}</li>)}
                           </ul>
                         </div>
                       )}
                        {tc.steps && tc.steps.length > 0 && (
                         <div>
                           <strong className="text-muted-foreground">Steps:</strong>
                           <ol className="list-decimal list-inside pl-4">
                             {tc.steps.map((s, i) => <li key={i}>{s}</li>)}
                           </ol>
                         </div>
                        )}
                       <p><strong className="text-muted-foreground">Expected Results:</strong> {tc.expectedResults}</p>
                       {tc.elementSelector && (
                          <p><strong className="text-muted-foreground">Element Selector:</strong> <code className="text-[11px] bg-muted px-1 rounded"><Code size={11} className="inline mr-1"/>{tc.elementSelector}</code></p>
                       )}
                       {tc.logExpectation && (
                         <p><strong className="text-muted-foreground">Log Expectation:</strong> {tc.logExpectation}</p>
                       )}
                       {tc.screenshotReference && (
                         <p><strong className="text-muted-foreground">Screenshot Ref:</strong> {tc.screenshotReference}</p>
                         // Optional: Display placeholder image if structure allows
                         // <Image src={`https://picsum.photos/seed/tc-${tc.id}/200/100`} width={200} height={100} alt="Ref Screenshot" className="mt-1 rounded border"/>
                       )}
                        {/* Add Edit/Delete buttons inside content */}
                       <div className="flex justify-end gap-2 mt-2">
                          <Button variant="outline" size="xs" onClick={() => alert(`Edit ${tc.id}`)}><Pencil className="h-3 w-3 mr-1"/> Edit</Button>
                          <Button variant="destructive" size="xs" onClick={() => alert(`Delete ${tc.id}`)}><Trash2 className="h-3 w-3 mr-1"/> Delete</Button>
                       </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </ScrollArea>
        </CardContent>
         {generatedTestCasesState.length > 0 && (
            <CardFooter>
                <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                    <FileText className="mr-2 h-4 w-4"/> Download Report
                </Button>
            </CardFooter>
         )}
      </Card>
    </div>
  );
}
