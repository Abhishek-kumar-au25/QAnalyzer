
'use server';
/**
 * @fileOverview AI flow for generating test cases based on feature descriptions.
 *
 * - generateTestCases - A function that handles the test case generation process.
 * - GenerateTestCasesInput - The input type for the generateTestCases function.
 * - GenerateTestCasesOutput - The return type for the generateTestCases function.
 * - TestCase - The type for an individual test case.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TestCaseSchema = z.object({
  id: z.string().describe('A unique identifier for the test case, e.g., TC-001. Ensure IDs are sequential if multiple test cases are generated.'),
  title: z.string().describe('A concise title for the test case.'),
  type: z.string().describe('The type of the test case (e.g., Positive, Negative, Boundary Value). This should generally match the input type if specified, or be determined by the context of the feature.'),
  priority: z.string().describe('The priority of the test case (e.g., High, Medium, Low). This should generally match the input priority if specified, or be determined by the context of the feature.'),
  description: z.string().describe('A brief description of what the test case aims to verify.'),
  preconditions: z.array(z.string()).min(1).describe('A list of conditions that must be met before executing the test case. Provide at least one precondition.'),
  steps: z.array(z.string()).min(1).describe('A numbered list of detailed, actionable steps to execute the test case. Provide at least one step.'),
  expectedResults: z.string().describe('The expected outcome after executing the test case steps. Be specific.'),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

const GenerateTestCasesInputSchema = z.object({
  featureDescription: z.string().min(1).describe('The detailed description of the feature or user story for which test cases need to be generated.'),
  testCaseType: z.string().describe('The desired type of test cases to generate (e.g., Positive, Negative, Boundary). This is a suggestion; the AI can adapt based on the feature.'),
  priority: z.string().describe('The desired priority of the test cases to generate (e.g., High, Medium, Low). This is a suggestion; the AI can adapt based on the feature.'),
});
export type GenerateTestCasesInput = z.infer<typeof GenerateTestCasesInputSchema>;

const GenerateTestCasesOutputSchema = z.object({
  testCases: z.array(TestCaseSchema).describe('An array of generated test cases. Aim to generate 3-5 test cases unless the feature is very simple.'),
});
export type GenerateTestCasesOutput = z.infer<typeof GenerateTestCasesOutputSchema>;

export async function generateTestCases(input: GenerateTestCasesInput): Promise<GenerateTestCasesOutput> {
  return generateTestCasesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTestCasesPrompt',
  model: 'googleai/gemini-1.5-flash', // Explicit model with provider
  input: { schema: GenerateTestCasesInputSchema },
  output: { schema: GenerateTestCasesOutputSchema },
  prompt: `You are an expert QA Engineer tasked with generating comprehensive test cases.
Based on the provided feature description, test case type, and priority, create a set of detailed test cases.

Feature Description:
{{{featureDescription}}}

Suggested Test Case Type: {{{testCaseType}}}
Suggested Priority: {{{priority}}}

Please generate a list of 3 to 5 test cases. Each test case must include:
- id: A unique identifier, starting from TC-001 and incrementing for subsequent cases (e.g., TC-001, TC-002).
- title: A concise and descriptive title for the test case.
- type: The type of test case (e.g., Positive, Negative, Boundary). Adapt from the suggested type if necessary for comprehensive coverage.
- priority: The priority of the test case (High, Medium, Low). Adapt from the suggested priority if necessary.
- description: A brief explanation of the test case's purpose.
- preconditions: An array of strings listing all necessary conditions that must be true before test execution.
- steps: An array of strings detailing the specific, ordered actions to perform for the test.
- expectedResults: A clear statement of the expected outcome or system behavior after executing the test steps.

Ensure the test cases are actionable, clear, and cover various aspects of the feature, including positive paths, negative paths, and edge cases where appropriate.
The number of preconditions and steps should be reasonable for a standard test case.
`,
});

const generateTestCasesFlow = ai.defineFlow(
  {
    name: 'generateTestCasesFlow',
    inputSchema: GenerateTestCasesInputSchema,
    outputSchema: GenerateTestCasesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate test cases. The model did not return any output.');
    }
    // Ensure IDs are somewhat sequential if model doesn't do it perfectly
    output.testCases.forEach((tc, index) => {
        if (!tc.id || !tc.id.startsWith('TC-')) {
            tc.id = `TC-${String(index + 1).padStart(3, '0')}`;
        }
    });
    return output;
  }
);

