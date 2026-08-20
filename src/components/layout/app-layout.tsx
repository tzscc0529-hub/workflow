'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  FileText,
  Database,
  Settings,
  Film,
} from 'lucide-react';

const navItems = [
  { href: '/', label: '概览', icon: LayoutDashboard },
  { href: '/analysis', label: '视频分析', icon: Video },
  { href: '/reports', label: '分析报告', icon: FileText },
  { href: '/knowledge', label: '知识库', icon: Database },
  { href: '/settings', label: '系统配置', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 border-b border-border/30 bg-surface-container-lowest">
        <Link href="/" className="flex items-center gap-3">
          <Film className="text-primary w-5 h-5" />
          <span
            className="text-lg tracking-wide text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Video Skeleton Analyst
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tracking-widest uppercase">
            v2.0
          </span>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
            初
          </div>
        </div>
      </header>

      <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-surface-container-lowest border-r border-border/30 overflow-y-auto">
          <nav className="p-4 space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors tracking-wide ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-background p-8">
          {children}
        </main>
      </div>
    </div>
  );
}