"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authSchema } from "@/lib/schemas";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type SignupFormValues = z.infer<typeof authSchema>;

export default function SignupForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Get plan params from URL (set by pricing page)
  const planParam = searchParams.get('plan');
  const intervalParam = searchParams.get('interval') || 'month';

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);

      // If user came from pricing page with a plan, initiate checkout
      if (planParam && planParam !== 'free') {
        try {
          const token = await userCredential.user.getIdToken();
          const res = await fetch('/api/subscription/checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              tier: planParam,
              interval: intervalParam,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              // Redirect to Stripe checkout
              window.location.href = data.url;
              return;
            }
          } else {
            // Checkout failed, but signup succeeded - go to dashboard
            console.error('Failed to create checkout session');
            toast({
              title: "Account created!",
              description: "You can upgrade your plan from the settings page.",
            });
          }
        } catch (checkoutError) {
          console.error('Checkout error:', checkoutError);
          toast({
            title: "Account created!",
            description: "You can upgrade your plan from the settings page.",
          });
        }
      }

      // No plan param or free plan - go to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please sign in.";
      }
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign Up
        </Button>
      </form>
    </Form>
  );
}
