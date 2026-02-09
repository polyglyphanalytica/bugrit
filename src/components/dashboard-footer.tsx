import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { TOOL_COUNT } from '@/lib/tools/registry';

export function DashboardFooter() {
  return (
    <footer className="border-t border-gray-100 py-8 mt-auto">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo href="/dashboard" size="sm" />
          <p className="text-gray-400 text-sm">
            {TOOL_COUNT} modules. 5,000+ automated security checks.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <Link href="/docs" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Docs
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
