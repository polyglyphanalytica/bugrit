'use server';

/**
 * @fileOverview Generates a paragraph of text and an image related to a given topic.
 *
 * - generateContentFromTopic - A function that generates content from a topic.
 * - GenerateContentFromTopicInput - The input type for the generateContentFromTopic function.
 * - GenerateContentFromTopicOutput - The return type for the generateContentFromTopic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateContentFromTopicInputSchema = z.object({
  topic: z.string().describe('The topic or keyword to generate content for.'),
});

export type GenerateContentFromTopicInput = z.infer<typeof GenerateContentFromTopicInputSchema>;

const GenerateContentFromTopicOutputSchema = z.object({
  paragraph: z.string().describe('A paragraph of text related to the topic.'),
  imageUrl: z.string().describe('The URL of the generated image.'),
});

export type GenerateContentFromTopicOutput = z.infer<typeof GenerateContentFromTopicOutputSchema>;

export async function generateContentFromTopic(
  input: GenerateContentFromTopicInput
): Promise<GenerateContentFromTopicOutput> {
  return generateContentFromTopicFlow(input);
}

const generateParagraphPrompt = ai.definePrompt({
  name: 'generateParagraphPrompt',
  input: {schema: GenerateContentFromTopicInputSchema},
  output: {schema: z.object({paragraph: z.string()})},
  prompt: `Write a paragraph about the following topic: {{{topic}}}`,
});

const generateImagePrompt = ai.definePrompt({
  name: 'generateImagePrompt',
  input: {schema: GenerateContentFromTopicInputSchema},
  output: {schema: z.object({imageUrl: z.string()})},
  prompt: `Generate an image of {{{topic}}}`,
});

const generateContentFromTopicFlow = ai.defineFlow(
  {
    name: 'generateContentFromTopicFlow',
    inputSchema: GenerateContentFromTopicInputSchema,
    outputSchema: GenerateContentFromTopicOutputSchema,
  },
  async input => {
    const paragraphResult = await generateParagraphPrompt(input);
    const imageResult = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Generate an image of ${input.topic}`,
    });
    return {
      paragraph: paragraphResult.output!.paragraph,
      imageUrl: imageResult.media!.url,
    };
  }
);
