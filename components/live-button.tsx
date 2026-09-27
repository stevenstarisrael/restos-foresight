import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';

export function LiveButton({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const cls = size === 'sm' ? 'px-3.5 py-1.5 text-sm' : 'px-6 py-3 text-base';
  return (
    <Link
      href="/live"
      className={`group inline-flex items-center gap-2 rounded-full bg-saffron font-medium text-white shadow-[0_0_40px_-8px_rgba(217,119,6,0.8)] transition hover:brightness-110 ${cls}`}
    >
      <Play size={size === 'sm' ? 14 : 18} className="fill-white" aria-hidden />
      Watch it live
      <ArrowRight size={size === 'sm' ? 14 : 18} className="transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
