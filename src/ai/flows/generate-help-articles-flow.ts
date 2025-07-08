
'use server';
/**
 * @fileOverview An AI agent for generating a batch of help articles for a given category.
 *
 * - generateHelpArticles - A function that handles the article generation process.
 * - GenerateHelpArticlesInput - The input type for the generateHelpArticles function.
 * - GenerateHelpArticlesOutput - The return type for the generateHelpArticles function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHelpArticlesInputSchema = z.object({
  categoryName: z.string().describe('The name of the help center category.'),
});
export type GenerateHelpArticlesInput = z.infer<typeof GenerateHelpArticlesInputSchema>;

const ArticleSchema = z.object({
    question: z.string().describe('A clear and concise question for the help article.'),
    answer: z.string().describe('A helpful and clear answer, formatted in Markdown.'),
});

const GenerateHelpArticlesOutputSchema = z.object({
  articles: z.array(ArticleSchema).describe('An array of 3 to 5 generated help articles.'),
});
export type GenerateHelpArticlesOutput = z.infer<typeof GenerateHelpArticlesOutputSchema>;

export async function generateHelpArticles(input: GenerateHelpArticlesInput): Promise<GenerateHelpArticlesOutput> {
  return generateHelpArticlesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHelpArticlesPrompt',
  input: {schema: GenerateHelpArticlesInputSchema},
  output: {schema: GenerateHelpArticlesOutputSchema},
  prompt: `You are a helpful and friendly support agent for an exam preparation platform called "TKS Prepify". Your task is to generate a set of 3 to 5 frequently asked questions and their corresponding answers for a specific help center category.

The answers should be clear, concise, and formatted in Markdown for readability (e.g., use bolding, bullet points, etc.).

Category: {{{categoryName}}}

Generate the questions and answers based on what a user might ask about this topic in the context of an exam preparation platform.`,
});

const generateHelpArticlesFlow = ai.defineFlow(
  {
    name: 'generateHelpArticlesFlow',
    inputSchema: GenerateHelpArticlesInputSchema,
    outputSchema: GenerateHelpArticlesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
