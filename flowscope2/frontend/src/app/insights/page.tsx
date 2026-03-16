'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/index';
import { insightsApi } from '@/lib/index';

type Insight = { id:string; title:string; description:string; severity:string; insightType:string; createdAt:string; automation?:{ automationName:string; toolName:string } };
type Intel = { criticalNodes?:Array<{name:string;reason:string}>; riskAreas?:Array<{description:string;severity:string}>; recommendations?:string[]; healthScore?:number; summary?:string };

const SEV_STYLE: Record<string,string> = { CRITICAL:'rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);color:#fca5a5', WARNING:'rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.18);color:#fde68a', INFO:'rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.18);color:#93c5fd' };
const ICONS: Record<string,string> = { DUPLICATE:'🔁', ORPHAN:'👻', BOTTLENECK:'🔴', COST:'💰', DEPENDENCY_RISK:'⚠️', PERFORMANCE:'⚡' };

function parseStyle(s: string) {
  return Object.fromEntries(s.split(';').filter(Boolean).map(p => { const [k,...v] = p.split(':'); return [k.trim(), v.join(':').trim()]; }));
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [intel, setIntel] = useState<Intel|null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => { const { data } = await insightsApi.list(); setInsights(data); setLoading(false); };
  const loadIntel = async () => { try { const { data } = await insightsApi.graphIntel(); setIntel(data); } catch {} };

  useEffect(() => { load(); loadIntel(); }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    await insightsApi.runFull();
    await load(); await loadIntel();
    setAnalyzing(false);
  };

  const dismiss = async (id: string) => {
    await insightsApi.dismiss(id);
    setInsights(p => p.filter(i => i.id !== id));
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily:'Syne,sans-serif' }}>AI Insights</h1>
            <p className="text-sm mt-1" style={{ color:'rgba(255,255,255,0.4)' }}>Gemini-powered automation intelligence</p>
          </div>
          <button onClick={runAnalysis} disabled={analyzing} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2" style={{ background:'#4a4ff5', fontFamily:'Syne,sans-serif' }}>
            {analyzing
              ? <><motion.span animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }} className="inline-block">✦</motion.span> Analyzing...</>
              : '✦ Run Full AI Analysis'
            }
          </button>
        </div>

        {intel && (
          <motion.div className="glass rounded-2xl p-6 mb-8" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-lg" style={{ fontFamily:'Syne,sans-serif' }}>Graph Intelligence</h2>
              {intel.healthScore !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color:'rgba(255,255,255,0.4)' }}>Ecosystem Health</span>
                  <span className="text-2xl font-bold" style={{ fontFamily:'Syne,sans-serif', color: intel.healthScore > 70 ? '#4ade80' : intel.healthScore > 40 ? '#fbbf24' : '#f87171' }}>{intel.healthScore}%</span>
                </div>
              )}
            </div>
            {intel.summary && <p className="text-sm mb-5" style={{ color:'rgba(255,255,255,0.6)' }}>{intel.summary}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {intel.criticalNodes?.length ? (
                <div>
                  <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color:'#f87171', fontFamily:'Syne,sans-serif' }}>Critical Nodes</h3>
                  {intel.criticalNodes.map((n,i) => <div key={i} className="text-sm mb-1.5" style={{ color:'rgba(255,255,255,0.7)' }}>• <strong className="text-white">{n.name}</strong>: {n.reason}</div>)}
                </div>
              ) : null}
              {intel.riskAreas?.length ? (
                <div>
                  <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color:'#fbbf24', fontFamily:'Syne,sans-serif' }}>Risk Areas</h3>
                  {intel.riskAreas.map((r,i) => <div key={i} className="text-sm mb-1.5" style={{ color:'rgba(255,255,255,0.7)' }}>• {r.description}</div>)}
                </div>
              ) : null}
              {intel.recommendations?.length ? (
                <div>
                  <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color:'#8097ff', fontFamily:'Syne,sans-serif' }}>Recommendations</h3>
                  {intel.recommendations.map((r,i) => <div key={i} className="text-sm mb-1.5" style={{ color:'rgba(255,255,255,0.7)' }}>• {r}</div>)}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-12" style={{ color:'rgba(255,255,255,0.4)' }}>Loading insights...</div>
        ) : insights.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">✦</div>
            <h3 className="font-semibold text-white text-lg mb-2" style={{ fontFamily:'Syne,sans-serif' }}>No insights yet</h3>
            <p className="text-sm" style={{ color:'rgba(255,255,255,0.4)' }}>Run AI analysis to detect duplicates, orphans, bottlenecks and more.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {['CRITICAL','WARNING','INFO'].map(sev => {
              const group = insights.filter(i => i.severity === sev);
              if (!group.length) return null;
              const style = parseStyle(SEV_STYLE[sev] || '');
              return (
                <div key={sev}>
                  <h2 className="text-xs uppercase tracking-wider mb-3" style={{ color:'rgba(255,255,255,0.4)', fontFamily:'Syne,sans-serif' }}>{sev} ({group.length})</h2>
                  <div className="space-y-3">
                    {group.map((ins, i) => (
                      <motion.div key={ins.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
                        className="rounded-xl p-5" style={{ background: style.background, border: style.border }}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-xl mt-0.5">{ICONS[ins.insightType]||'•'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm" style={{ color: style.color, fontFamily:'Syne,sans-serif' }}>{ins.title}</span>
                                <span className="text-xs px-2 py-0.5 rounded" style={{ color: style.color, background:'rgba(255,255,255,0.08)' }}>{ins.insightType}</span>
                              </div>
                              <p className="text-sm" style={{ color: style.color, opacity:0.8 }}>{ins.description}</p>
                              {ins.automation && <div className="text-xs mt-2" style={{ color: style.color, opacity:0.5 }}>{ins.automation.automationName} · {ins.automation.toolName}</div>}
                            </div>
                          </div>
                          <button onClick={()=>dismiss(ins.id)} className="ml-4 flex-shrink-0 transition-opacity hover:opacity-100" style={{ color: style.color, opacity:0.4 }}>✕</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
