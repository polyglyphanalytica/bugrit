import { Suspense } from "react";
import SignupForm from "@/components/auth/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

function SignupFormFallback() {
  return (
    <div className="space-y-6">
      <div className="h-10 bg-muted animate-pulse rounded" />
      <div className="h-10 bg-muted animate-pulse rounded" />
      <div className="h-10 bg-muted animate-pulse rounded" />
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">
            Start Your First Scan
          </CardTitle>
          <CardDescription>
            Create a free account and Sensei will scan your code in under 2 minutes. No credit card required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<SignupFormFallback />}>
            <SignupForm />
          </Suspense>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-orange-500 underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            10 free credits included &middot; Scan public or private repos &middot; AI-powered fix suggestions
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
