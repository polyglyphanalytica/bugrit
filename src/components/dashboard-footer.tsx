import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export function DashboardFooter() {
  return (
    <footer className="border-t border-border/50 py-8 mt-auto">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo href="/dashboard" size="sm" />
          <p className="text-muted-foreground text-sm">
            Web + iOS + Android + Desktop. One AI report.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
