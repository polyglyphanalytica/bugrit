"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createContent, type ActionResult } from "@/app/actions";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
      {pending ? "Generating..." : "Generate"}
      <Sparkles className="ml-2 h-4 w-4" />
    </Button>
  );
}

export default function ContentGenerator() {
  const [state, formAction] = useFormState(createContent, undefined);
  const { user } = useAuth();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    async function handleResult() {
      if (state?.data && user && formRef.current) {
        const topic = (formRef.current.elements.namedItem("topic") as HTMLInputElement)?.value;
        try {
          await addDoc(collection(db, `users/${user.uid}/creations`), {
            topic: topic,
            paragraph: state.data.paragraph,
            imageUrl: state.data.imageUrl,
            createdAt: serverTimestamp(),
          });
          formRef.current?.reset();
        } catch (error) {
          console.error("Error saving to Firestore:", error);
          toast({
            variant: "destructive",
            title: "Database Error",
            description: "Could not save content to your collection.",
          });
        }
      } else if (state?.error) {
        toast({
          variant: "destructive",
          title: "Generation Error",
          description: state.error,
        });
      }
    }
    handleResult();
  }, [state, user, toast]);

  return (
    <Card className="shadow-md transition-shadow hover:shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create something new</CardTitle>
        <CardDescription>Enter a topic and let AI bring your idea to life.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex items-center gap-4">
          <Input
            name="topic"
            placeholder="e.g., 'A cat wearing a wizard hat'"
            required
            className="flex-grow text-base"
          />
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
