'use client';
import { useState } from 'react';
import { AppShell } from '@/components/index';
import { discoveryApi } from '@/lib/index';

const EXAMPLES: Record<string,string> = {
  generic: JSON.stringify([
    { name:"New Order Email", tool:"Custom", owner:"Sales Team", trigger:{ type:"webhook", event:"order.created" }, actions:[{ type:"email", template:"order_confirmation" }], tags:["orders","email"] },
    { name:"CRM Lead Update", tool:"Zapier", owner:"Marketing", trigger:{ type:"form_submit" }, actions:[{ type:"crm_create", object:"contact" }], dependencies:[] }
  ], null, 2),
  zapier: JSON.stringify([{ title:"New Lead → HubSpot", steps:[{ type:"trigger", app:"Typeform" },{ type:"action", app:"HubSpot", action:"Create Contact" }], status:"on" }], null, 2),
  'power-automate': JSON.stringify([{ properties:{ displayName:"Approval Workflow", triggers:{ manual:{ type:"Request" } }, actions:{ sendEmail:{ type:"ApiConnection", kind:"SendEmail" } } } }], null, 2),
};

export default function SettingsPage() {
  const [format, setFormat] = useState('generic');
  const [json, setJson] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await discoveryApi.ingest(format, JSON.parse(json));
      setResult(`✓ ${data.message}`); setJson('');
    } catch (err) { setResult(`✗ Failed: ${err instanceof Error ? err.message : 'Invalid JSON or server error'}`); }
    setLoading(false);
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-colors";
  const inputStyle = { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' };
  const labelStyle = { color:'rgba(255,255,255,0.5)', fontFamily:'Syne,sans-serif' };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily:'Syne,sans-serif' }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color:'rgba(255,255,255,0.4)' }}>Import automations and platform configuration</p>
        </div>

        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-white text-lg mb-2" style={{ fontFamily:'Syne,sans-serif' }}>Import Automations</h2>
          <p className="text-sm mb-6" style={{ color:'rgba(255,255,255,0.4)' }}>Upload definitions from Zapier, Power Automate, or custom JSON</p>

          <div className="mb-5">
            <label className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>Source Format</label>
            <div className="flex gap-3">
              {['generic','zapier','power-automate'].map(f => (
                <button key={f} onClick={() => { setFormat(f); setJson(EXAMPLES[f]); }}
                  className="px-4 py-2 rounded-lg text-sm transition-colors" style={{ fontFamily:'Syne,sans-serif', color: format===f ? '#a5bbff':'rgba(255,255,255,0.4)', background: format===f ? 'rgba(74,79,245,0.2)':'rgba(255,255,255,0.04)', border: format===f ? '1px solid rgba(74,79,245,0.3)':'1px solid rgba(255,255,255,0.08)' }}>
                  {f==='generic' ? 'Generic JSON' : f==='power-automate' ? 'Power Automate' : 'Zapier'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider" style={labelStyle}>JSON Definition</label>
                <button type="button" onClick={()=>setJson(EXAMPLES[format])} className="text-xs transition-colors" style={{ color:'#6271ff' }}>Load Example</button>
              </div>
              <textarea value={json} onChange={e=>setJson(e.target.value)} rows={12} placeholder="Paste automation JSON here..."
                className={inputCls} style={{ ...inputStyle, fontFamily:'JetBrains Mono,monospace', fontSize:'12px', resize:'none', color:'rgba(255,255,255,0.8)' }}
                onFocus={e=>e.target.style.borderColor='#4a4ff5'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'} />
            </div>
            {result && (
              <div className="p-3 rounded-xl text-sm" style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'13px', background: result.startsWith('✓') ? 'rgba(74,222,128,0.08)':'rgba(248,113,113,0.08)', border: result.startsWith('✓') ? '1px solid rgba(74,222,128,0.2)':'1px solid rgba(248,113,113,0.2)', color: result.startsWith('✓') ? '#86efac':'#fca5a5' }}>{result}</div>
            )}
            <button type="submit" disabled={loading || !json.trim()} className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-40" style={{ background:'#4a4ff5', fontFamily:'Syne,sans-serif' }}>
              {loading ? 'Importing...' : 'Import Automations'}
            </button>
          </form>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold text-white text-lg mb-4" style={{ fontFamily:'Syne,sans-serif' }}>Stack Info</h2>
          <div className="space-y-3">
            {[['API Endpoint', process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000'],['AI Provider','Google Gemini'],['Queue','BullMQ + Redis'],['Real-time','Socket.IO'],['Database','PostgreSQL + Prisma']].map(([l,v]) => (
              <div key={l} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-sm" style={{ color:'rgba(255,255,255,0.5)' }}>{l}</span>
                <span className="text-xs" style={{ color:'#8097ff', fontFamily:'JetBrains Mono,monospace' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
