'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppShell } from '@/components/index';
import { analyticsApi, getSocket, useAuthStore } from '@/lib/index';

const COLORS = ['#6271ff','#8097ff','#a5bbff','#4a4ff5','#3d3ddf'];

function Card({ label, value, color }: { label: string; value: string|number; color?: string }) {
  return (
    <motion.div className="glass rounded-2xl p-6" whileHover={{ scale:1.01 }} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
      <div className="text-xs uppercase tracking-wider mb-3" style={{ color:'rgba(255,255,255,0.4)', fontFamily:'Syne,sans-serif' }}>{label}</div>
      <div className="text-4xl font-bold" style={{ fontFamily:'Syne,sans-serif', color: color || '#fff' }}>{value}</div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Record<string,number>|null>(null);
  const [top, setTop] = useState<unknown[]>([]);
  const [tools, setTools] = useState<unknown[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [live, setLive] = useState<string[]>([]);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    const [m,t,td,h] = await Promise.all([analyticsApi.metrics(), analyticsApi.top(), analyticsApi.byTool(), analyticsApi.history(30)]);
    setMetrics(m.data); setTop(t.data); setTools(td.data); setHistory(h.data);
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    if (user?.id) socket.emit('join:dashboard', user.id);
    const evts = ['automation.created','automation.updated','automation.failed','automation.deleted'];
    evts.forEach(e => socket.on(e, (d:{type:string}) => { setLive(p => [`${new Date().toLocaleTimeString()}: ${d.type}`,...p.slice(0,9)]); load(); }));
    return () => evts.forEach(e => socket.off(e));
  }, [load, user?.id]);

  const hs = metrics?.healthScore ?? 0;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily:'Syne,sans-serif' }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color:'rgba(255,255,255,0.4)' }}>Your automation ecosystem at a glance</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card label="Total Automations" value={metrics?.total ?? '—'} />
          <Card label="Active" value={metrics?.active ?? '—'} color="#4ade80" />
          <Card label="Failed" value={metrics?.failed ?? '—'} color="#f87171" />
          <Card label="Health Score" value={metrics ? `${hs}%` : '—'} color={hs > 70 ? '#4ade80' : '#fbbf24'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4" style={{ fontFamily:'Syne,sans-serif' }}>Execution History (30d)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={history as Record<string,unknown>[]}>
                <defs>
                  <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4a4ff5" stopOpacity={0.3}/><stop offset="95%" stopColor="#4a4ff5" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10 }} />
                <YAxis tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10 }} />
                <Tooltip contentStyle={{ background:'#13132b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#fff' }} />
                <Area type="monotone" dataKey="success" stroke="#4a4ff5" fill="url(#gs)" name="Success" />
                <Area type="monotone" dataKey="failure" stroke="#ef4444" fill="url(#gf)" name="Failure" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4" style={{ fontFamily:'Syne,sans-serif' }}>By Platform</h2>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={tools as Record<string,unknown>[]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="count" nameKey="toolName">
                  {(tools as unknown[]).map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background:'#13132b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#fff' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-3">
              {(tools as Record<string,unknown>[]).slice(0,4).map((t,i) => (
                <div key={String(t.toolName)} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background:COLORS[i%COLORS.length] }} /><span style={{ color:'rgba(255,255,255,0.6)' }}>{String(t.toolName)}</span></div>
                  <span style={{ color:'rgba(255,255,255,0.4)' }}>{String(t.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4" style={{ fontFamily:'Syne,sans-serif' }}>Top by Executions</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(top as Record<string,unknown>[]).slice(0,6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10 }} />
                <YAxis type="category" dataKey="automationName" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:9 }} width={110} />
                <Tooltip contentStyle={{ background:'#13132b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#fff' }} />
                <Bar dataKey="executionCount" fill="#6271ff" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-semibold text-white" style={{ fontFamily:'Syne,sans-serif' }}>Live Events</h2>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            {live.length === 0
              ? <p className="text-sm" style={{ color:'rgba(255,255,255,0.3)' }}>Waiting for events...</p>
              : live.map((e,i) => <motion.div key={i} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} className="text-xs font-mono py-1.5 border-b" style={{ color:'#8097ff', borderColor:'rgba(255,255,255,0.05)', fontFamily:'JetBrains Mono,monospace' }}>{e}</motion.div>)
            }
          </div>
        </div>
      </div>
    </AppShell>
  );
}
