"use client";

import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import ContentDisplay from "./content-display";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

type Content = {
  id: string;
  topic: string;
  paragraph: string;
  imageUrl: string;
};

function ContentListSkeleton() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <CardContent className="p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ContentList() {
  const { user } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    };

    setLoading(true);
    const q = query(
      collection(db, `users/${user.uid}/creations`),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const creations: Content[] = [];
      querySnapshot.forEach((doc) => {
        creations.push({ id: doc.id, ...doc.data() } as Content);
      });
      setContent(creations);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching content:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <ContentListSkeleton />;
  }
  
  if (content.length === 0) {
    return (
      <div className="text-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-16">
        <h2 className="font-headline text-2xl tracking-tight text-muted-foreground">Your creations will appear here</h2>
        <p className="text-muted-foreground">Use the generator above to create your first piece of content.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {content.map((item) => (
        <ContentDisplay key={item.id} {...item} />
      ))}
    </div>
  );
}
