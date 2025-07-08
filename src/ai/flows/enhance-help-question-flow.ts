
'use server';
/**
 * @fileOverview An AI agent for enhancing help article questions.
 *
 * - enhanceHelpQuestion - A function that handles the question enhancement process.
 * - EnhanceHelpQuestionInput - The input type for the enhanceHelpQuestion function.
 * - EnhanceHelpQuestionOutput - The return type for the enhanceHelpQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceHelpQuestionInputSchema = z.object({
  question: z.string().describe('The original question/title of the help article.'),
});
export type EnhanceHelpQuestionInput = z.infer<typeof EnhanceHelpQuestionInputSchema>;

const EnhanceHelpQuestionOutputSchema = z.object({
  enhancedQuestion: z.string().describe('A clearer, more concise, and user-friendly version of the question.'),
});
export type EnhanceHelpQuestionOutput = z.infer<typeof EnhanceHelpQuestionOutputSchema>;

export async function enhanceHelpQuestion(input: EnhanceHelpQuestionInput): Promise<EnhanceHelpQuestionOutput> {
  return enhanceHelpQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'enhanceHelpQuestionPrompt',
  input: {schema: EnhanceHelpQuestionInputSchema},
  output: {schema: EnhanceHelpQuestionOutputSchema},
  prompt: `You are an expert content editor for a help center. Your task is to refine a user's question to make it clearer, more concise, and easier to understand for someone seeking help.

The application is an exam preparation platform called "TKS Prepify".

Original Question: {{{question}}}

Rewrite the question to be more effective for a help center FAQ.`,
});

const enhanceHelpQuestionFlow = ai.defineFlow(
  {
    name: 'enhanceHelpQuestionFlow',
    inputSchema: EnhanceHelpQuestionInputSchema,
    outputSchema: EnhanceHelpQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
