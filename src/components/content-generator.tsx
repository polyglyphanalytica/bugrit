"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createContent, type ActionResult } from "@/app/actions";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
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
    if (state?.data) {
      // Content was generated and saved on the server
      formRef.current?.reset();
      if (!state.data.saved) {
        toast({
          variant: "destructive",
          title: "Save Warning",
          description: "Content generated but could not be saved to your collection.",
        });
      }
    } else if (state?.error) {
      toast({
        variant: "destructive",
        title: "Generation Error",
        description: state.error,
      });
    }
  }, [state, toast]);

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
          {/* Pass userId to server action for server-side Firestore write */}
          <input type="hidden" name="userId" value={user?.uid || ""} />
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
