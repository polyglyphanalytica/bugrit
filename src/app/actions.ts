"use server";

import { generateContentFromTopic } from "@/ai/flows/generate-content-from-topic";
import { z } from "zod";
import { db, FieldValue } from "@/lib/firebase/admin";

const formSchema = z.object({
  topic: z.string().min(2, "Topic must be at least 2 characters long."),
  userId: z.string().optional(),
});

export type ActionResult = {
  data?: {
    paragraph: string;
    imageUrl: string;
    saved?: boolean;
  };
  error?: string;
};

export async function createContent(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const validatedFields = formSchema.safeParse({
    topic: formData.get("topic"),
    userId: formData.get("userId"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors.topic?.[0] || "Invalid input.",
    };
  }

  const { topic, userId } = validatedFields.data;

  try {
    const result = await generateContentFromTopic({ topic });
    if (!result.paragraph || !result.imageUrl) {
        throw new Error("Generated content is incomplete.");
    }

    // Save to Firestore on the server side if user is authenticated
    let saved = false;
    if (userId && db) {
      try {
        await db.collection('users').doc(userId).collection('creations').add({
          topic,
          paragraph: result.paragraph,
          imageUrl: result.imageUrl,
          createdAt: FieldValue.serverTimestamp(),
        });
        saved = true;
      } catch (saveError) {
        console.error("Error saving to Firestore:", saveError);
        // Don't fail the whole operation if saving fails
      }
    }

    return { data: { paragraph: result.paragraph, imageUrl: result.imageUrl, saved } };
  } catch (e) {
    console.error(e);
    return { error: "Failed to generate content. Please try again later." };
  }
}
