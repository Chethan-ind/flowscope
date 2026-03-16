'use client';
import { useEffect, useState, useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge, NodeTypes, Handle, Position, BackgroundVariant } from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/index';
import { automationsApi } from '@/lib/index';

const SC: Record<string,string> = { ACTIVE:'#4ade80', FAILED:'#f87171', INACTIVE:'#fbbf24', PAUSED:'#60a5fa' };

function AutoNode({ data }: { data: { label:string; toolName:string; status:string; failureRate:number } }) {
  const c = SC[data.status] || '#6271ff';
  return (
    <div style={{ padding:'10px 14px', borderRadius:'12px', minWidth:'160px', background:'rgba(14,14,30,0.97)', border:`1px solid ${c}`, boxShadow:`0 0 14px ${c}20`, color:'#fff', fontFamily:'DM Sans,sans-serif' }}>
      <Handle type="target" position={Position.Left} style={{ background:c, border:'none', width:8, height:8 }} />
      <div style={{ fontWeight:600, fontSize:'12px', marginBottom:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{data.label}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)' }}>{data.toolName}</span>
        <span style={{ fontSize:'11px', color:c }}>{data.status}</span>
      </div>
      {data.failureRate > 0 && <div style={{ fontSize:'11px', color:'#f87171', marginTop:'3px' }}>{data.failureRate.toFixed(1)}% fail</div>}
      <Handle type="source" position={Position.Right} style={{ background:c, border:'none', width:8, height:8 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { automationNode: AutoNode };

export default function VisualizerPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Node|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await automationsApi.graph();
      setNodes(data.nodes);
      setEdges(data.edges.map((e: Edge) => ({ ...e, style:{ stroke:'#4a4ff5', strokeWidth:2 }, markerEnd:{ type:'arrowclosed', color:'#4a4ff5' } })));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppShell>
      <div style={{ height:'calc(100vh - 4rem)', display:'flex', flexDirection:'column' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily:'Syne,sans-serif' }}>Flow Visualizer</h1>
            <p className="text-sm mt-1" style={{ color:'rgba(255,255,255,0.4)' }}>Automation dependency map</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-5 glass px-4 py-2 rounded-xl text-xs">
              {Object.entries(SC).map(([s,c]) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background:c }} />
                  <span style={{ color:'rgba(255,255,255,0.6)' }}>{s}</span>
                </div>
              ))}
            </div>
            <button onClick={load} className="px-4 py-2 rounded-xl glass text-sm transition-all" style={{ color:'rgba(255,255,255,0.6)' }}>Refresh</button>
          </div>
        </div>

        <div className="flex-1 glass rounded-2xl overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center" style={{ color:'rgba(255,255,255,0.4)' }}>Building dependency graph...</div>
          ) : nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div><div className="text-5xl mb-4">⬡</div><p style={{ color:'rgba(255,255,255,0.4)' }}>No automations found.</p><p className="text-sm mt-1" style={{ color:'rgba(255,255,255,0.2)' }}>Add automations in Inventory to see the map.</p></div>
            </div>
          ) : (
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView onNodeClick={(_,n) => setSelected(n)} style={{ background:'transparent' }}>
              <Background variant={BackgroundVariant.Dots} color="rgba(99,102,241,0.15)" gap={24} size={1} />
              <Controls style={{ background:'rgba(14,14,30,0.9)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px' }} />
              <MiniMap style={{ background:'rgba(14,14,30,0.9)', border:'1px solid rgba(255,255,255,0.1)' }} nodeColor={n => SC[n.data?.status] || '#6271ff'} />
            </ReactFlow>
          )}
        </div>

        {selected && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="mt-4 glass rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white" style={{ fontFamily:'Syne,sans-serif' }}>{selected.data.label}</span>
              <span className="text-sm ml-3" style={{ color:'rgba(255,255,255,0.4)' }}>{selected.data.toolName}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium" style={{ color: SC[selected.data.status] }}>{selected.data.status}</span>
              <span className="text-sm" style={{ color:'rgba(255,255,255,0.4)' }}>Failure: {Number(selected.data.failureRate)?.toFixed(1)}%</span>
              <button onClick={()=>setSelected(null)} style={{ color:'rgba(255,255,255,0.3)' }}>✕</button>
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
