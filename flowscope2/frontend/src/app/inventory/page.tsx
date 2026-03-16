'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { AppShell } from '@/components/index';
import { automationsApi } from '@/lib/index';

const S: Record<string, string> = { ACTIVE: 'color:#4ade80;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2)', FAILED: 'color:#f87171;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2)', INACTIVE: 'color:#fbbf24;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2)', PAUSED: 'color:#60a5fa;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2)' };

export default function InventoryPage() {
  const [autos, setAutos] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ automationName: '', toolName: '', owner: '', description: '', automationUrl: '' });

  const load = async () => {
    setLoading(true);
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (status) p.status = status;
    const { data } = await automationsApi.list(p);
    setAutos(data.automations); setTotal(data.total); setLoading(false);
  };

  useEffect(() => { load(); }, [search, status]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await automationsApi.create({ ...form, trigger: { type: 'manual' }, actions: [{ type: 'action', name: 'Default' }], dependencies: [] });
    setModal(false); setForm({ automationName: '', toolName: '', owner: '', description: '', automationUrl: '' }); load();
  };

  const del = async (id: string) => {
    if (confirm('Delete this automation?')) { await automationsApi.delete(id); load(); }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne,sans-serif' }}>Inventory</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{total} automations tracked</p>
          </div>
          <button onClick={() => setModal(true)} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105" style={{ background: '#4a4ff5', fontFamily: 'Syne,sans-serif' }}>
            + New Automation
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search automations..."
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm transition-colors focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => e.target.style.borderColor = '#4a4ff5'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="">All Status</option>
            {['ACTIVE', 'FAILED', 'INACTIVE', 'PAUSED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Name', 'Platform', 'Owner', 'Status', 'Executions', 'Failure Rate', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Syne,sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={7} className="px-6 py-12 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading...</td></tr>
                : autos.length === 0
                  ? <tr><td colSpan={7} className="px-6 py-12 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No automations. Create your first!</td></tr>
                  : autos.map((a, i) => (
                    <motion.tr key={String(a.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td className="px-6 py-4">
                        <Link href={`/inventory/${a.id}`} className="text-white text-sm font-medium hover:text-brand-300 transition-colors">{String(a.automationName)}</Link>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{String(a.toolName)}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{String(a.owner)}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={Object.fromEntries(String(S[String(a.status)] || '').split(';').filter(Boolean).map(p => p.split(':')))}>{String(a.status)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{Number(a.executionCount).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono" style={{ color: Number(a.failureRate) > 10 ? '#f87171' : Number(a.failureRate) > 5 ? '#fbbf24' : '#4ade80' }}>
                          {Number(a.failureRate).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link href={`/inventory/${a.id}`} className="px-3 py-1 rounded-lg text-xs transition-colors" style={{ background: 'rgba(74,79,245,0.15)', color: '#a5bbff' }}>View</Link>
                          <button onClick={() => del(String(a.id))} className="px-3 py-1 rounded-lg text-xs transition-colors" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>Delete</button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        <AnimatePresence>
          {modal && (
            <motion.div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="glass-strong rounded-2xl p-8 w-full max-w-lg mx-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'Syne,sans-serif' }}>Create Automation</h2>
                <form onSubmit={create} className="space-y-4">
                  {[{ k: 'automationName', l: 'Name', p: 'New Order → Send Email' }, { k: 'automationUrl', l: 'Automation URL (optional)', p: 'https://zapier.com/app/editor/....' }, { k: 'toolName', l: 'Platform', p: 'Zapier, Power Automate, Custom...' }, { k: 'owner', l: 'Owner', p: 'Team or person responsible' }, { k: 'description', l: 'Description (optional)', p: 'What does this automation do?' }].map(f => (
                    <div key={f.k}>
                      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Syne,sans-serif' }}>{f.l}</label>
                      <input value={form[f.k as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                        placeholder={f.p} required={f.k !== 'description' && f.k !== 'automationUrl'}
                        className="w-full px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onFocus={e => e.target.style.borderColor = '#4a4ff5'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors" style={{ background: '#4a4ff5', fontFamily: 'Syne,sans-serif' }}>Create</button>
                    <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl glass text-sm transition-all" style={{ color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
