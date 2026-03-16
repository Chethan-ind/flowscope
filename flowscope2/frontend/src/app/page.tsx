'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authApi, useAuthStore } from '@/lib/index';

const FEATURES = [
  { icon: '🗺️', title: 'Automation Map', desc: 'Visual dependency graph showing how every automation connects across your stack.' },
  { icon: '🤖', title: 'Gemini AI', desc: 'Duplicate detection, orphan finding, bottleneck analysis, and ecosystem health scoring.' },
  { icon: '⚡', title: 'Real-time', desc: 'Socket.IO live dashboard updates — no refresh needed for status changes.' },
  { icon: '🔄', title: 'Version History', desc: 'Git-like versioning with one-click rollback for every automation change.' },
  { icon: '💣', title: 'Impact Simulator', desc: 'Preview cascading effects before disabling any automation.' },
  { icon: '💰', title: 'Cost Analytics', desc: 'Execution cost estimates and usage patterns across all platforms.' },
];

export default function Home() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const autoRegister = async (attempts = 3) => {
    for (let i = 0; i < attempts; i += 1) {
      const randomId = Math.random().toString(36).substring(2, 10);
      const email = `user-${randomId}@flowscope.com`;
      const password = `pass-${Math.random().toString(36)}`;
      const name = `Explorer ${randomId}`;
      try {
        const { data } = await authApi.register({ email, password, name });
        return data;
      } catch (err: unknown) {
        const error = err as { response?: any; message?: string };
        if (error.response?.status === 409 && i < attempts - 1) {
          continue; // retry with a new random user
        }
        throw err;
      }
    }
    throw new Error('Unable to create an auto-generated user after multiple attempts');
  };

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      const data = await autoRegister(4);
      setAuth(data.user, data.token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: any; message?: string };
      const status = error.response?.status;
      const serverMessage = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail;

      console.error('Failed to auto-start session', error);

      if (status === 409) {
        alert('User already exists. Please try again.');
      } else if (status === 400) {
        alert(`Invalid user data: ${JSON.stringify(error.response?.data?.errors || serverMessage)}`);
      } else if (status === 500) {
        alert(`Server error: ${serverMessage || 'Internal Server Error (500)'}`);
      } else {
        alert(serverMessage || error.message || 'Could not start session. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a14', fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern" style={{ backgroundSize: '40px 40px', opacity: 0.25 }} />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <motion.div key={i} className="absolute rounded-full"
            style={{
              width: `${200 + i * 80}px`, height: `${200 + i * 80}px`, left: `${10 + i * 14}%`, top: `${5 + i * 10}%`,
              background: i % 2 === 0 ? 'radial-gradient(circle,rgba(74,79,245,0.18),transparent)' : 'radial-gradient(circle,rgba(128,151,255,0.12),transparent)', filter: 'blur(40px)'
            }}
            animate={{ x: [0, 25, 0], y: [0, -18, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
          />
        ))}
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6271ff,#3d3ddf)' }}>
            <span className="text-white text-sm font-bold" style={{ fontFamily: 'Syne,sans-serif' }}>F</span>
          </div>
          <span className="font-bold text-xl text-white" style={{ fontFamily: 'Syne,sans-serif' }}>FlowScope</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleGetStarted} disabled={loading} className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50" style={{ background: '#4a4ff5', fontFamily: 'Syne,sans-serif' }}>
            {loading ? 'Starting...' : 'Get Started'}
          </button>
        </div>
      </nav>

      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-32 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm glass" style={{ color: '#a5bbff' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI-Powered Automation Intelligence
          </div>
          <h1 className="text-7xl font-bold text-white mb-6 leading-none" style={{ fontFamily: 'Syne,sans-serif', letterSpacing: '-0.03em' }}>
            Google Maps<br />
            <span style={{ background: 'linear-gradient(135deg,#8097ff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              for Automations
            </span>
          </h1>
          <p className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Complete visibility into every automation across Zapier, Power Automate, and custom scripts.
            Track, analyze, and optimize your entire workflow ecosystem.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={handleGetStarted} disabled={loading} className="px-8 py-4 rounded-xl text-white font-bold text-lg transition-all hover:scale-105 disabled:opacity-50" style={{ background: '#4a4ff5', fontFamily: 'Syne,sans-serif', boxShadow: '0 0 30px rgba(74,79,245,0.3)' }}>
              {loading ? 'Starting...' : 'Start Free →'}
            </button>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} className="glass rounded-2xl p-6 cursor-default"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.02 }}>
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white text-lg mb-2" style={{ fontFamily: 'Syne,sans-serif' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-4xl mx-auto px-8 pb-32 text-center">
        <motion.div className="glass-strong rounded-3xl p-12" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>Ready to map your automation universe?</h2>
          <p className="mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>Get started in minutes. No credit card required.</p>
          <button onClick={handleGetStarted} disabled={loading} className="inline-block px-10 py-4 rounded-xl text-white font-bold text-lg transition-all hover:scale-105 disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#4a4ff5,#7c3aed)', fontFamily: 'Syne,sans-serif' }}>
            {loading ? 'Launching...' : 'Launch FlowScope →'}
          </button>
        </motion.div>
      </section>
    </div>
  );
}
