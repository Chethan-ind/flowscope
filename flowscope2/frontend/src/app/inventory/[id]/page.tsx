'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/index';
import { automationsApi } from '@/lib/index';

type AutoDetail = Record<string, unknown> & {
  versions: Record<string, unknown>[]; healthLogs: Record<string, unknown>[]; aiInsights: Record<string, unknown>[];
};

export default function AutoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [auto, setAuto] = useState<AutoDetail | null>(null);
  const [impact, setImpact] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    automationsApi.get(id as string).then(({ data }) => setAuto(data));
  }, [id]);

  const loadImpact = async () => {
    const { data } = await automationsApi.impact(id as string);
    setImpact(data); setTab('impact');
  };

  const rollback = async (versionId: string) => {
    if (!confirm('Rollback to this version?')) return;
    await automationsApi.rollback(id as string, versionId);
    const { data } = await automationsApi.get(id as string);
    setAuto(data);
  };

  if (!auto) return <AppShell><div style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</div></AppShell>;

  const SEV: Record<string, string> = { CRITICAL: '#f87171', WARNING: '#fbbf24', INFO: '#60a5fa' };
  const RISK: Record<string, string> = { HIGH: '#f87171', MEDIUM: '#fbbf24', LOW: '#4ade80' };
  const TYPE_ICON: Record<string, string> = { DUPLICATE: '🔁', ORPHAN: '👻', BOTTLENECK: '🔴', COST: '💰', DEPENDENCY_RISK: '⚠️', PERFORMANCE: '⚡' };
  const TABS = ['overview', 'versions', 'health', 'insights', 'impact'];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <button onClick={() => router.back()} className="text-sm mb-3 transition-colors block" style={{ color: 'rgba(255,255,255,0.4)' }}>← Back</button>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne,sans-serif' }}>{String(auto.automationName)}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{String(auto.toolName)}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{String(auto.owner)}</span>
              <span className="px-2.5 py-1 rounded-lg text-xs" style={{ color: auto.status === 'ACTIVE' ? '#4ade80' : '#f87171', background: auto.status === 'ACTIVE' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${auto.status === 'ACTIVE' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}` }}>{String(auto.status)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {Boolean(auto.automationUrl) && (
              <a href={String(auto.automationUrl)} target="_blank" rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                style={{ background: 'rgba(74,79,245,0.15)', border: '1px solid rgba(74,79,245,0.2)', color: '#a5bbff', fontFamily: 'Syne,sans-serif' }}>
                Open in {String(auto.toolName)} ↗
              </a>
            )}
            <button onClick={loadImpact} className="px-5 py-2.5 rounded-xl text-sm font-display transition-all hover:scale-105" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.2)', color: '#fdba74', fontFamily: 'Syne,sans-serif' }}>
              ⚡ Simulate Impact
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {[['Executions', Number(auto.executionCount).toLocaleString()], ['Failure Rate', `${Number(auto.failureRate).toFixed(1)}%`], ['Est. Cost', `$${Number(auto.estimatedCost).toFixed(2)}`], ['Dependencies', String((auto.dependencies as string[]).length)]].map(([l, v]) => (
            <div key={l} className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne,sans-serif' }}>{v}</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className="px-4 py-2 rounded-lg text-sm transition-colors" style={{ fontFamily: 'Syne,sans-serif', color: tab === t ? '#a5bbff' : 'rgba(255,255,255,0.4)', background: tab === t ? 'rgba(74,79,245,0.2)' : 'transparent', border: tab === t ? '1px solid rgba(74,79,245,0.3)' : '1px solid transparent' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {tab === 'overview' && (
            <div className="glass rounded-2xl p-6 space-y-6">
              {Boolean(auto.description) && <div><h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Syne,sans-serif' }}>Description</h3><p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{String(auto.description)}</p></div>}
              <div><h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Syne,sans-serif' }}>Trigger</h3><pre className="rounded-xl p-4 text-xs overflow-auto" style={{ background: '#13132b', color: '#a5bbff', fontFamily: 'JetBrains Mono,monospace' }}>{JSON.stringify(auto.trigger, null, 2)}</pre></div>
              <div><h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Syne,sans-serif' }}>Actions</h3><pre className="rounded-xl p-4 text-xs overflow-auto" style={{ background: '#13132b', color: '#86efac', fontFamily: 'JetBrains Mono,monospace' }}>{JSON.stringify(auto.actions, null, 2)}</pre></div>
            </div>
          )}

          {tab === 'versions' && (
            <div className="glass rounded-2xl overflow-hidden">
              {auto.versions.length === 0 ? <div className="p-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No versions yet</div>
                : auto.versions.map((v, i) => (
                  <div key={String(v.id)} className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div><span className="text-sm" style={{ color: '#8097ff', fontFamily: 'JetBrains Mono,monospace' }}>v{String(v.version)}</span><span className="text-sm ml-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{String(v.changeSummary || 'No summary')}</span></div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{new Date(String(v.createdAt)).toLocaleDateString()}</span>
                      {i > 0 && <button onClick={() => rollback(String(v.id))} className="px-3 py-1 rounded-lg text-xs" style={{ background: 'rgba(251,191,36,0.1)', color: '#fcd34d' }}>Rollback</button>}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {tab === 'health' && (
            <div className="glass rounded-2xl overflow-hidden">
              {auto.healthLogs.length === 0 ? <div className="p-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No health logs</div>
                : auto.healthLogs.map(log => (
                  <div key={String(log.id)} className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: log.status === 'SUCCESS' ? '#4ade80' : '#f87171' }} />
                      <span className="text-sm" style={{ color: log.status === 'SUCCESS' ? '#4ade80' : '#f87171' }}>{String(log.status)}</span>
                      {Boolean(log.errorMessage) && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{String(log.errorMessage)}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {Boolean(log.duration) && <span>{Number(log.duration).toFixed(0)}ms</span>}
                      <span>{new Date(String(log.createdAt)).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {tab === 'insights' && (
            <div className="space-y-4">
              {auto.aiInsights.length === 0 ? <div className="glass rounded-2xl p-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No insights yet. Run AI analysis from the Insights page.</div>
                : auto.aiInsights.map(ins => (
                  <div key={String(ins.id)} className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: SEV[String(ins.severity)], fontFamily: 'Syne,sans-serif' }}>{String(ins.severity)}</span>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                      <span className="text-lg">{TYPE_ICON[String(ins.insightType)] || '•'}</span>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{String(ins.insightType)}</span>
                    </div>
                    <h3 className="text-white font-medium text-sm">{String(ins.title)}</h3>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{String(ins.description)}</p>
                  </div>
                ))}
            </div>
          )}

          {tab === 'impact' && (
            <div className="glass rounded-2xl p-6">
              {!impact ? (
                <div className="text-center py-8">
                  <p className="mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Click "Simulate Impact" above to analyze cascading effects</p>
                  <button onClick={loadImpact} className="px-6 py-3 rounded-xl text-sm" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.2)', color: '#fdba74', fontFamily: 'Syne,sans-serif' }}>Run Simulation</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {[['Direct Dependents', String(impact.directDependents), '#fff'], ['Total Affected', String(impact.totalAffected), '#fff'], ['Risk Level', String(impact.riskLevel), RISK[String(impact.riskLevel)] || '#fff']].map(([l, v, c]) => (
                      <div key={l} className="text-center p-4 rounded-xl" style={{ background: '#13132b' }}>
                        <div className="text-3xl font-bold" style={{ fontFamily: 'Syne,sans-serif', color: c }}>{v}</div>
                        <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {(impact.affectedAutomations as Record<string, unknown>[])?.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Syne,sans-serif' }}>Affected Automations</h3>
                      <div className="space-y-2">
                        {(impact.affectedAutomations as Record<string, unknown>[]).map((a, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#13132b' }}>
                            <span className="text-white text-sm">{String(a.automationName)}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{String(a.toolName)}</span>
                              <span className="text-xs" style={{ color: '#fbbf24' }}>{String(a.status)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
