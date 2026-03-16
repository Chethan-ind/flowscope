'use client';
/**
 * FlowScope – Shared UI Components
 * Contains: Sidebar, AppShell
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/index';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/inventory', label: 'Inventory', icon: '◉' },
  { href: '/visualizer', label: 'Flow Map', icon: '⬡' },
  { href: '/insights', label: 'AI Insights', icon: '✦' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col z-50" style={{ background: 'rgba(10,10,20,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
      <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6271ff,#3d3ddf)' }}>
            <span className="text-white text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>F</span>
          </div>
          <div>
            <div className="font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>FlowScope</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Automation Intelligence</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                style={{ color: active ? '#a5bbff' : 'rgba(255,255,255,0.4)', background: active ? 'rgba(74,79,245,0.15)' : 'transparent', border: active ? '1px solid rgba(74,79,245,0.2)' : '1px solid transparent' }}
                whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
              >
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span className="text-sm font-medium" style={{ fontFamily: 'Syne, sans-serif' }}>{item.label}</span>
                {active && <motion.div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#8097ff' }} layoutId="dot" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#1c1e55', color: '#8097ff', fontFamily: 'Syne, sans-serif' }}>
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user?.name}</div>
            <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={() => { clearAuth(); router.push('/auth/login'); }}
          className="w-full px-3 py-2 rounded-lg text-left text-xs transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Syne, sans-serif' }}
          onMouseEnter={e => (e.target as HTMLElement).style.color = '#fff'}
          onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)'}>
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { token, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!localStorage.getItem('fs_token')) router.push('/auth/login');
  }, [token, router]);

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0a14' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern" style={{ backgroundSize: '40px 40px', opacity: 0.2 }} />
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: `${400 + i * 120}px`, height: `${400 + i * 120}px`, right: `${i * 20}%`, bottom: `${i * 15}%`, background: 'radial-gradient(circle, rgba(74,79,245,0.12), transparent)', filter: 'blur(60px)' }}
            animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ duration: 10 + i * 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <Sidebar />
      <main className="flex-1 relative z-10" style={{ marginLeft: '240px' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="p-8">
          {children}
        </motion.div>
      </main>
    </div>
  );
}
