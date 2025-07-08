
'use server';
/**
 * @fileOverview An AI agent for generating answers to help articles.
 *
 * - generateHelpAnswer - A function that handles the answer generation process.
 * - GenerateHelpAnswerInput - The input type for the generateHelpAnswer function.
 * - GenerateHelpAnswerOutput - The return type for the generateHelpAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHelpAnswerInputSchema = z.object({
  question: z.string().describe('The question for which to generate an answer.'),
});
export type GenerateHelpAnswerInput = z.infer<typeof GenerateHelpAnswerInputSchema>;

const GenerateHelpAnswerOutputSchema = z.object({
  answer: z.string().describe('A helpful and clear answer, formatted in Markdown.'),
});
export type GenerateHelpAnswerOutput = z.infer<typeof GenerateHelpAnswerOutputSchema>;

export async function generateHelpAnswer(input: GenerateHelpAnswerInput): Promise<GenerateHelpAnswerOutput> {
  return generateHelpAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHelpAnswerPrompt',
  input: {schema: GenerateHelpAnswerInputSchema},
  output: {schema: GenerateHelpAnswerOutputSchema},
  prompt: `You are a helpful and friendly support agent for an exam preparation platform called "TKS Prepify". Your task is to write a clear and concise answer for a help center article based on the provided question.

Use Markdown for formatting (e.g., bolding, bullet points, numbered lists) to make the answer easy to read and follow.

Question: {{{question}}}

Provide a comprehensive and easy-to-understand answer.`,
});

const generateHelpAnswerFlow = ai.defineFlow(
  {
    name: 'generateHelpAnswerFlow',
    inputSchema: GenerateHelpAnswerInputSchema,
    outputSchema: GenerateHelpAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
