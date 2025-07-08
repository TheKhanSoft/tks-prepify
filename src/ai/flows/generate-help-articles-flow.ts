
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
  articles: z.array(ArticleSchema).describe('An array of generated help articles, with a number of questions appropriate for the given category. Some categories might only need 2-3 questions, while broader ones might need more.'),
});
export type GenerateHelpArticlesOutput = z.infer<typeof GenerateHelpArticlesOutputSchema>;

export async function generateHelpArticles(input: GenerateHelpArticlesInput): Promise<GenerateHelpArticlesOutput> {
  return generateHelpArticlesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHelpArticlesPrompt',
  input: {schema: GenerateHelpArticlesInputSchema},
  output: {schema: GenerateHelpArticlesOutputSchema},
  prompt: `You are an expert content strategist for "TKS Prepify," an online exam preparation platform.

Your task is to create a set of the most common and important frequently asked questions (FAQs) and their answers for a specific help center category.

Instead of a fixed number, use your judgment to determine how many questions are appropriate for the topic. A narrow topic might only need 2 or 3 questions, while a broader one could require 5 or more. Focus on quality and relevance over quantity.

The answers should be clear, concise, and formatted in Markdown for readability (e.g., use bolding, bullet points, numbered lists, etc.). Frame all responses from the perspective of supporting users of an exam prep website.

Category: {{{categoryName}}}

Generate the most relevant questions and answers a user would have about this topic on the TKS Prepify platform.`,
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
