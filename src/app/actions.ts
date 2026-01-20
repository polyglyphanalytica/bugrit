"use server";

import { generateContentFromTopic } from "@/ai/flows/generate-content-from-topic";
import { z } from "zod";

const formSchema = z.object({
  topic: z.string().min(2, "Topic must be at least 2 characters long."),
});

export type ActionResult = {
  data?: {
    paragraph: string;
    imageUrl: string;
  };
  error?: string;
};

export async function createContent(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const validatedFields = formSchema.safeParse({
    topic: formData.get("topic"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors.topic?.[0] || "Invalid input.",
    };
  }

  const { topic } = validatedFields.data;

  try {
    const result = await generateContentFromTopic({ topic });
    if (!result.paragraph || !result.imageUrl) {
        throw new Error("Generated content is incomplete.");
    }
    return { data: { paragraph: result.paragraph, imageUrl: result.imageUrl } };
  } catch (e) {
    console.error(e);
    return { error: "Failed to generate content. Please try again later." };
  }
}
