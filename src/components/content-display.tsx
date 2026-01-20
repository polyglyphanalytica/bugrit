import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type ContentDisplayProps = {
  topic: string;
  paragraph: string;
  imageUrl: string;
};

export default function ContentDisplay({
  topic,
  paragraph,
  imageUrl,
}: ContentDisplayProps) {
  return (
    <Card className="group overflow-hidden shadow-md transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="relative aspect-video w-full overflow-hidden">
          <Image 
            src={imageUrl} 
            alt={topic} 
            fill 
            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className="p-6">
          <CardTitle className="mb-2 font-headline text-xl capitalize">{topic}</CardTitle>
          <CardDescription className="font-body text-base text-foreground/80">
            {paragraph}
          </CardDescription>
        </div>
      </CardContent>
    </Card>
  );
}
