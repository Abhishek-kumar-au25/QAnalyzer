
'use server';
/**
 * @fileOverview AI flow for generating improvement suggestions based on provided context.
 *
 * - generateSuggestions - A function that handles the suggestion generation process.
 * - GenerateSuggestionsInput - The input type for the generateSuggestions function.
 * - GenerateSuggestionsOutput - The return type for the generateSuggestions function.
 * - Suggestion - The type for an individual suggestion.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestionSchema = z.object({
  id: z.string().describe('A unique identifier for the suggestion (e.g., SUG-001).'),
  category: z.string().describe('The category of the suggestion (e.g., Performance, Security, UI/UX, Accessibility, Test Coverage, Feature Enhancement). Determine the most relevant category based on the context.'),
  suggestion: z.string().describe('The detailed suggestion for improvement. Be specific and actionable.'),
  rationale: z.string().describe('A brief explanation of why this suggestion is being made, based on the input context.'),
  priority: z.string().describe('The suggested priority (e.g., High, Medium, Low). Estimate based on potential impact.'),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

const GenerateSuggestionsInputSchema = z.object({
  context: z.string().min(20).describe('Detailed context for analysis. This could be a feature description, user story, test results summary, code snippet, performance metrics, user feedback, or any relevant information about the application or feature being analyzed. Must be at least 20 characters.'),
  areaFocus: z.string().optional().describe('Optional: Specify an area to focus on (e.g., "performance bottlenecks", "UI improvements", "security vulnerabilities").'),
});
export type GenerateSuggestionsInput = z.infer<typeof GenerateSuggestionsInputSchema>;

const GenerateSuggestionsOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('An array of generated suggestions. Aim for 2-4 relevant suggestions based on the context.'),
});
export type GenerateSuggestionsOutput = z.infer<typeof GenerateSuggestionsOutputSchema>;

export async function generateSuggestions(input: GenerateSuggestionsInput): Promise<GenerateSuggestionsOutput> {
  return generateSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSuggestionsPrompt',
  model: 'googleai/gemini-1.5-flash', // Explicit model with provider
  input: { schema: GenerateSuggestionsInputSchema },
  output: { schema: GenerateSuggestionsOutputSchema },
  prompt: `You are an expert AI assistant analyzing application context to provide actionable improvement suggestions.
Based on the provided context and optional area of focus, generate a list of 2-4 targeted suggestions.

Context Provided:
{{{context}}}

{{#if areaFocus}}
Specific Area of Focus: {{{areaFocus}}}
{{/if}}

Generate suggestions covering relevant categories like Performance, Security, UI/UX, Accessibility, Test Coverage, or Feature Enhancements. Each suggestion must include:
- id: A unique identifier, starting from SUG-001.
- category: The most relevant category.
- suggestion: A specific, actionable improvement recommendation.
- rationale: A brief justification based on the provided context.
- priority: Estimated priority (High, Medium, Low) based on potential impact or severity inferred from the context.

Focus on providing insightful and practical suggestions derived directly from the input context. If the context is too vague, provide general best-practice suggestions relevant to the focus area (if provided) or common application development areas.
`,
});

const generateSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateSuggestionsFlow',
    inputSchema: GenerateSuggestionsInputSchema,
    outputSchema: GenerateSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate suggestions. The model did not return any output.');
    }
    // Ensure suggestions have sequential IDs if the model misses it
     output.suggestions.forEach((sug, index) => {
        if (!sug.id || !sug.id.startsWith('SUG-')) {
            sug.id = `SUG-${String(index + 1).padStart(3, '0')}`;
        }
     });
    return output;
  }
);

