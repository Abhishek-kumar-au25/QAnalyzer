'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, Wand2, Loader2, Info, AlertTriangle, CheckCircle, Brain, Gauge, ShieldCheck, Pencil, ClipboardList, Code, Accessibility as AccessibilityIconLucide } from 'lucide-react'; // Renamed Accessibility to avoid conflict
import type { GenerateSuggestionsInput, Suggestion } from '@/ai/flows/generate-suggestions-flow';
import { generateSuggestions } from '@/ai/flows/generate-suggestions-flow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Image from 'next/image';

interface ExtendedSuggestion extends Suggestion {
    steps?: string[];
    codeSnippet?: string;
    screenshotUrl?: string;
}

const formSchema = z.object({
  context: z.string().min(20, { message: 'Please provide at least 20 characters of context.' }).max(5000, { message: 'Context cannot exceed 5000 characters.' }),
  areaFocus: z.string().optional(),
});

type SuggestionsFormValues = z.infer<typeof formSchema>;

const focusAreas = ["Performance", "Security", "UI/UX", "Accessibility", "Test Coverage", "Feature Enhancement", "General"];
const NO_FOCUS_VALUE = "_NO_FOCUS_AREA_";

const priorityMap: Record<string, { color: string, label: string }> = {
    High: { color: 'bg-red-500 text-white', label: 'High' },
    Medium: { color: 'bg-yellow-500 text-black', label: 'Medium' },
    Low: { color: 'bg-blue-500 text-white', label: 'Low' },
};

const categoryMap: Record<string, React.ElementType> = {
    Performance: Gauge,
    Security: ShieldCheck,
    "UI/UX": Pencil,
    Accessibility: AccessibilityIconLucide, // Use renamed import
    "Test Coverage": ClipboardList,
    "Feature Enhancement": Lightbulb,
    Default: Brain,
};

export default function SuggestionsClient() {
  const [suggestions, setSuggestions] = useState<ExtendedSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SuggestionsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      context: '',
      areaFocus: NO_FOCUS_VALUE, 
    },
  });

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const onSubmit = async (data: SuggestionsFormValues) => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const input: GenerateSuggestionsInput = {
        context: data.context,
        areaFocus: data.areaFocus === NO_FOCUS_VALUE || !data.areaFocus ? undefined : data.areaFocus,
      };
      const result = await generateSuggestions(input);

       const extendedSuggestions = result.suggestions.map(sug => ({
         ...sug,
         steps: sug.category === 'Performance' ? ['1. Identify bottleneck using profiling.', '2. Optimize the slow function.', '3. Add caching layer.'] :
                sug.category === 'UI/UX' ? ['1. Redesign component X.', '2. Conduct A/B test.', '3. Gather user feedback.'] :
                undefined,
         codeSnippet: sug.category === 'Security' ? `// Example: Sanitize input\nconst sanitizedInput = sanitizeHtml(userInput);` : undefined,
         screenshotUrl: sug.category === 'UI/UX' ? `https://picsum.photos/seed/suggestion-${sug.id}/400/200` : undefined,
       }));

      setSuggestions(extendedSuggestions);
      toast({
        title: 'Suggestions Generated',
        description: `Successfully generated ${result.suggestions.length} suggestion(s).`,
      });
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast({
        variant: 'destructive',
        title: 'Error Generating Suggestions',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

   const getPriorityBadge = (priority: string) => {
    const config = priorityMap[priority] || { color: 'bg-gray-500 text-white', label: priority || 'N/A' };
    return (
      <Badge className={cn("text-xs font-medium", config.color)}>
        {config.label}
      </Badge>
    );
  }

  const getCategoryIcon = (category: string) => {
     const Icon = categoryMap[category] || categoryMap.Default;
     return <Icon className="h-4 w-4 mr-1.5 text-muted-foreground" />;
  }

   const renderSuggestionDetails = (suggestion: ExtendedSuggestion) => (
    <div className="space-y-3 text-xs pt-2 pb-3">
        <p className="break-words"><strong className="text-muted-foreground">Rationale:</strong> {suggestion.rationale}</p>
         {suggestion.steps && suggestion.steps.length > 0 && (
             <div>
                 <strong className="text-muted-foreground">Implementation Steps (Example):</strong>
                 <ol className="list-decimal list-inside pl-4">
                     {suggestion.steps.map((step, i) => <li key={i}>{step}</li>)}
                 </ol>
             </div>
        )}
         {suggestion.codeSnippet && (
             <div>
                 <strong className="text-muted-foreground">Code Snippet (Example):</strong>
                 <pre className="mt-1 p-2 bg-muted rounded-md text-[11px] overflow-x-auto"><code className="font-mono">{suggestion.codeSnippet}</code></pre>
             </div>
         )}
          {suggestion.screenshotUrl && (
            <div className="mt-2">
                <strong className="text-muted-foreground block mb-1">Visual Example (Simulated):</strong>
                <Image src={suggestion.screenshotUrl} alt={`Visual for suggestion ${suggestion.id}`} width={400} height={200} className="rounded border shadow-sm max-w-full h-auto" data-ai-hint="UI element" />
            </div>
        )}
    </div>
  );

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="ml-2 text-muted-foreground">Loading Suggestions Engine...</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><Brain className="mr-2"/> Input Context</CardTitle>
          <CardDescription>Provide context for the AI to analyze and suggest improvements.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="context"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context / Description / Data</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the feature, paste test results, user feedback, code snippet, etc."
                        className="min-h-[250px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="areaFocus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area of Focus (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || NO_FOCUS_VALUE}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select focus area (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_FOCUS_VALUE}>None</SelectItem>
                        {focusAreas.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
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
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Suggestions
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="md:col-span-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><Lightbulb className="mr-2"/> AI-Powered Suggestions</CardTitle>
          <CardDescription>Review the suggestions generated based on the provided context.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-18rem)] sm:h-[500px] pr-4"> {/* Adjusted height */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
                <p>Generating suggestions...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 border border-dashed rounded-lg">
                <Info className="h-12 w-12 text-accent mb-4" />
                <p className="text-lg font-medium">Suggestions will appear here.</p>
                <p className="text-sm">Provide context on the left and click "Generate".</p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full space-y-3">
                {suggestions.map((sug) => (
                  <AccordionItem key={sug.id} value={sug.id} className="border rounded-lg px-4 bg-background hover:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3 text-left"> {/* Added text-left */}
                       <div className="flex justify-between items-center gap-2 flex-grow mr-4">
                         {/* Container for icon, category, and suggestion to allow suggestion to wrap if needed */}
                         <div className="flex items-start gap-2 overflow-hidden min-w-0"> {/* Changed items-center to items-start, added min-w-0 */}
                            {getCategoryIcon(sug.category)}
                            <div className="flex flex-col min-w-0"> {/* Wrapper for category and suggestion for better layout control */}
                                <span className="font-semibold text-foreground truncate" title={`${sug.category} (${sug.id})`}>
                                    {sug.category} ({sug.id})
                                </span>
                                <span className="text-muted-foreground text-xs hidden sm:inline-block break-words" title={sug.suggestion}> {/* Removed truncate, added sm:inline-block and break-words */}
                                    {sug.suggestion}
                                </span>
                            </div>
                         </div>
                         {getPriorityBadge(sug.priority)}
                       </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {renderSuggestionDetails(sug)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

