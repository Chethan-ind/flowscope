/**
 * FlowScope – Automation Inventory & Flow Intelligence Platform
 * Single-file backend: Express + Prisma + Socket.IO + BullMQ + Gemini AI
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import IORedis from 'ioredis';
import { Queue, Worker, Job } from 'bullmq';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { body, validationResult } from 'express-validator';
import winston from 'winston';

// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
  transports: [new winston.transports.Console()],
});

// ─── Prisma ──────────────────────────────────────────────────────────────────
export const prisma = new PrismaClient();

// ─── Redis ───────────────────────────────────────────────────────────────────
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new IORedis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (e) => logger.error('Redis error', e));

// ─── Queues ──────────────────────────────────────────────────────────────────
const automationQueue = new Queue('automations', { connection: redis as any, defaultJobOptions: { removeOnComplete: 100, removeOnFail: 50 } });
const aiQueue = new Queue('ai-analysis', { connection: redis as any, defaultJobOptions: { removeOnComplete: 50, removeOnFail: 25 } });

// ─── Express + Socket.IO ─────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: { origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'], methods: ['GET', 'POST'], credentials: true },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json({ limit: '10mb' }));

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod';

interface AuthReq extends Request { userId?: string; }

const authenticate = async (req: AuthReq, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'No token' }); return; }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) { res.status(401).json({ error: 'User not found' }); return; }
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
  next();
};

// ─── Event Emitter ────────────────────────────────────────────────────────────
const emitEvent = async (type: string, payload: Record<string, unknown>): Promise<void> => {
  io.emit(type, { type, payload, timestamp: new Date().toISOString() });
  await automationQueue.add(type, { type, payload }, { attempts: 3 });
};

// ─── Version Helper ───────────────────────────────────────────────────────────
const saveVersion = async (automationId: string, snapshot: Record<string, unknown>, changeSummary?: string) => {
  const latest = await prisma.automationVersion.findFirst({ where: { automationId }, orderBy: { version: 'desc' } });
  await prisma.automationVersion.create({ data: { automationId, version: (latest?.version || 0) + 1, snapshot: snapshot as any, changeSummary } });
};

// ─── Gemini AI Service ────────────────────────────────────────────────────────
const getModel = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-pro' });
};

const safeJsonParse = <T>(text: string, fallback: T): T => {
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
  catch { return fallback; }
};

const aiDetectDuplicates = async (userId: string): Promise<void> => {
  const automations = await prisma.automation.findMany({ where: { userId }, select: { id: true, automationName: true, trigger: true, actions: true } });
  if (automations.length < 2) return;
  try {
    const model = getModel();
    const result = await model.generateContent(
      `Find duplicate automations. Return JSON array of {ids:string[], reason:string, similarity:number}. Only JSON, no markdown.\n${JSON.stringify(automations)}`
    );
    const groups = safeJsonParse<Array<{ ids: string[]; reason: string; similarity: number }>>(result.response.text(), []);
    for (const g of groups) {
      if (g.ids.length >= 2 && g.similarity > 70) {
        for (const id of g.ids) {
          await prisma.aiInsight.create({ data: { automationId: id, insightType: 'DUPLICATE', title: 'Potential Duplicate Detected', description: `${g.reason} (${g.similarity}% similarity)`, severity: 'WARNING', metadata: { duplicateIds: g.ids } } });
        }
      }
    }
  } catch (e) { logger.error('Duplicate detection failed', e); }
};

const aiDetectOrphans = async (userId: string): Promise<void> => {
  const automations = await prisma.automation.findMany({ where: { userId }, select: { id: true, automationName: true, dependencies: true, lastRun: true } });
  const referenced = new Set(automations.flatMap(a => a.dependencies));
  for (const a of automations) {
    if (!referenced.has(a.id) && a.dependencies.length === 0 && !a.lastRun) {
      const exists = await prisma.aiInsight.findFirst({ where: { automationId: a.id, insightType: 'ORPHAN', dismissed: false } });
      if (!exists) await prisma.aiInsight.create({ data: { automationId: a.id, insightType: 'ORPHAN', title: 'Orphan Automation', description: `"${a.automationName}" has no dependencies, isn't referenced, and has never run. It may be unused.`, severity: 'INFO' } });
    }
  }
};

const aiDetectBottlenecks = async (userId: string): Promise<void> => {
  const automations = await prisma.automation.findMany({ where: { userId }, select: { id: true, automationName: true, dependencies: true } });
  const count: Record<string, number> = {};
  for (const a of automations) for (const dep of a.dependencies) count[dep] = (count[dep] || 0) + 1;
  for (const [id, n] of Object.entries(count).filter(([, v]) => v >= 3)) {
    const a = automations.find(x => x.id === id);
    if (!a) continue;
    const exists = await prisma.aiInsight.findFirst({ where: { automationId: id, insightType: 'BOTTLENECK', dismissed: false } });
    if (!exists) await prisma.aiInsight.create({ data: { automationId: id, insightType: 'BOTTLENECK', title: 'Critical Bottleneck', description: `"${a.automationName}" is depended on by ${n} workflows. A failure here cascades broadly.`, severity: n >= 6 ? 'CRITICAL' : 'WARNING', metadata: { dependentCount: n } } });
  }
};

const aiGraphIntelligence = async (userId: string): Promise<Record<string, unknown>> => {
  const automations = await prisma.automation.findMany({ where: { userId }, select: { id: true, automationName: true, toolName: true, status: true, dependencies: true, failureRate: true } });
  try {
    const model = getModel();
    const result = await model.generateContent(
      `Analyze this automation ecosystem. Return JSON: {criticalNodes:[{id,name,reason}], riskAreas:[{description,severity}], recommendations:string[], healthScore:number, summary:string}. Only JSON.\n${JSON.stringify(automations)}`
    );
    return safeJsonParse(result.response.text(), { healthScore: 75, summary: 'Analysis complete.', criticalNodes: [], riskAreas: [], recommendations: ['Add more automations for deeper insights'] });
  } catch { return { healthScore: 75, summary: 'AI unavailable.', criticalNodes: [], riskAreas: [], recommendations: [] }; }
};

const aiEstimateCosts = async (userId: string): Promise<void> => {
  const costs: Record<string, number> = { Zapier: 0.002, 'Power Automate': 0.003, Make: 0.001, Custom: 0.0005 };
  const automations = await prisma.automation.findMany({ where: { userId } });
  for (const a of automations) {
    const cost = a.executionCount * (costs[a.toolName] || 0.001);
    await prisma.automation.update({ where: { id: a.id }, data: { estimatedCost: cost } });
  }
};

// ─── BullMQ Workers ───────────────────────────────────────────────────────────
const initWorkers = () => {
  new Worker('automations', async (job: Job) => {
    const { type, payload } = job.data;
    if ((type === 'automation.created' || type === 'automation.updated') && (payload as Record<string, string>).userId) {
      await aiDetectOrphans((payload as Record<string, string>).userId);
      await aiDetectBottlenecks((payload as Record<string, string>).userId);
    }
  }, { connection: redis as any, concurrency: 5 });

  new Worker('ai-analysis', async (job: Job) => {
    const { userId, type } = job.data;
    if (type === 'duplicates' || type === 'full') await aiDetectDuplicates(userId);
    if (type === 'orphans' || type === 'full') await aiDetectOrphans(userId);
    if (type === 'bottlenecks' || type === 'full') await aiDetectBottlenecks(userId);
    if (type === 'costs' || type === 'full') await aiEstimateCosts(userId);
  }, { connection: redis as any, concurrency: 2 });

  logger.info('BullMQ workers ready');
};

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join:dashboard', (uid: string) => socket.join(`user:${uid}`));
  socket.on('disconnect', () => { });
});

// ─── Routes: Health ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Routes: Auth ─────────────────────────────────────────────────────────────
app.post('/api/auth/register',
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 }), body('name').trim().notEmpty(), validate],
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (await prisma.user.findUnique({ where: { email: req.body.email } })) {
        res.status(409).json({ error: 'Email already registered' }); return;
      }
      const user = await prisma.user.create({ data: { email: req.body.email, name: req.body.name, passwordHash: await bcrypt.hash(req.body.password, 12) }, select: { id: true, email: true, name: true, createdAt: true } });
      res.status(201).json({ user, token: jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' }) });
    } catch (e) {
      logger.error('Registration failed', e);
      res.status(500).json({ error: 'Registration failed', detail: e instanceof Error ? e.message : String(e) });
    }
  }
);

app.post('/api/auth/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty(), validate],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({ where: { email: req.body.email } });
      if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
        res.status(401).json({ error: 'Invalid credentials' }); return;
      }
      res.json({ user: { id: user.id, email: user.email, name: user.name }, token: jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' }) });
    } catch (e) { logger.error(e); res.status(500).json({ error: 'Login failed' }); }
  }
);

app.get('/api/auth/me', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true, name: true, createdAt: true } });
  user ? res.json(user) : res.status(404).json({ error: 'Not found' });
});

// ─── Routes: Automations ──────────────────────────────────────────────────────
app.get('/api/automations', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const { status, search, limit = '50', offset = '0' } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { userId: req.userId };
  if (status) where.status = status;
  if (search) where.OR = [{ automationName: { contains: search, mode: 'insensitive' } }, { toolName: { contains: search, mode: 'insensitive' } }, { owner: { contains: search, mode: 'insensitive' } }];
  const [automations, total] = await Promise.all([
    prisma.automation.findMany({ where, take: +limit, skip: +offset, orderBy: { createdAt: 'desc' }, include: { _count: { select: { healthLogs: true, aiInsights: true } } } }),
    prisma.automation.count({ where }),
  ]);
  res.json({ automations, total });
});

app.get('/api/automations/graph', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const automations = await prisma.automation.findMany({ where: { userId: req.userId }, select: { id: true, automationName: true, toolName: true, status: true, dependencies: true, failureRate: true } });
  const nodes = automations.map((a, i) => ({ id: a.id, type: 'automationNode', position: { x: (i % 5) * 260, y: Math.floor(i / 5) * 160 }, data: { label: a.automationName, toolName: a.toolName, status: a.status, failureRate: a.failureRate } }));
  const edges: unknown[] = [];
  for (const a of automations) for (const dep of a.dependencies) if (automations.find(x => x.id === dep)) edges.push({ id: `${dep}-${a.id}`, source: dep, target: a.id, animated: true });
  res.json({ nodes, edges });
});

app.get('/api/automations/:id', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const auto = await prisma.automation.findFirst({ where: { id: req.params.id as string, userId: req.userId }, include: { versions: { orderBy: { version: 'desc' }, take: 10 }, healthLogs: { orderBy: { createdAt: 'desc' }, take: 20 }, aiInsights: { where: { dismissed: false } } } });
  auto ? res.json(auto) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/automations', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  try {
    const auto = await prisma.automation.create({ data: { ...req.body, userId: req.userId!, dependencies: req.body.dependencies || [], tags: req.body.tags || [], automationUrl: req.body.automationUrl || null } });
    await saveVersion(auto.id, auto as unknown as Record<string, unknown>, 'Initial version');
    await emitEvent('automation.created', { ...auto, userId: req.userId! });
    res.status(201).json(auto);
  } catch (e) { logger.error(e); res.status(500).json({ error: 'Create failed' }); }
});

app.put('/api/automations/:id', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const exists = await prisma.automation.findFirst({ where: { id: req.params.id as string, userId: req.userId } });
  if (!exists) { res.status(404).json({ error: 'Not found' }); return; }
  const updated = await prisma.automation.update({ where: { id: req.params.id as string }, data: { ...req.body, updatedAt: new Date() } });
  await saveVersion(updated.id, updated as unknown as Record<string, unknown>, req.body.changeSummary || 'Updated');
  await emitEvent('automation.updated', { ...updated, userId: req.userId! });
  res.json(updated);
});

app.delete('/api/automations/:id', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const exists = await prisma.automation.findFirst({ where: { id: req.params.id as string, userId: req.userId } });
  if (!exists) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.automation.delete({ where: { id: req.params.id as string } });
  await emitEvent('automation.deleted', { id: req.params.id as string });
  res.json({ message: 'Deleted' });
});

app.get('/api/automations/:id/impact', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const paramsId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  const auto = await prisma.automation.findFirst({ where: { id: paramsId, userId: req.userId } });
  if (!auto) { res.status(404).json({ error: 'Not found' }); return; }
  const direct = await prisma.automation.findMany({ where: { userId: req.userId, dependencies: { has: auto.id } }, select: { id: true, automationName: true, toolName: true, status: true } });
  const all = [...direct];
  for (const d of direct) {
    const deeper = await prisma.automation.findMany({ where: { userId: req.userId, dependencies: { has: d.id } }, select: { id: true, automationName: true, toolName: true, status: true } });
    all.push(...deeper.filter(x => !all.find(a => a.id === x.id)));
  }
  res.json({ automationName: auto.automationName, directDependents: direct.length, totalAffected: all.length, affectedAutomations: all, riskLevel: all.length > 5 ? 'HIGH' : all.length > 2 ? 'MEDIUM' : 'LOW' });
});

app.post('/api/automations/:id/rollback', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const paramsId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  const version = await prisma.automationVersion.findFirst({ where: { id: req.body.versionId as string, automationId: paramsId } });
  if (!version) { res.status(404).json({ error: 'Version not found' }); return; }
  const snap = version.snapshot as Record<string, unknown>;
  const updated = await prisma.automation.update({ where: { id: paramsId }, data: { automationName: snap.automationName as string, automationUrl: snap.automationUrl as string | null, toolName: snap.toolName as string, owner: snap.owner as string, trigger: snap.trigger as any, actions: snap.actions as any, dependencies: snap.dependencies as string[], description: snap.description as string | null, tags: snap.tags as string[] } });
  await saveVersion(updated.id, updated as unknown as Record<string, unknown>, `Rolled back to v${version.version}`);
  res.json(updated);
});

// ─── Routes: Analytics ────────────────────────────────────────────────────────
app.get('/api/analytics/metrics', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const uid = req.userId;
  const [total, active, failed, inactive, paused, avgFail, totalCost] = await Promise.all([
    prisma.automation.count({ where: { userId: uid } }),
    prisma.automation.count({ where: { userId: uid, status: 'ACTIVE' } }),
    prisma.automation.count({ where: { userId: uid, status: 'FAILED' } }),
    prisma.automation.count({ where: { userId: uid, status: 'INACTIVE' } }),
    prisma.automation.count({ where: { userId: uid, status: 'PAUSED' } }),
    prisma.automation.aggregate({ where: { userId: uid }, _avg: { failureRate: true } }),
    prisma.automation.aggregate({ where: { userId: uid }, _sum: { estimatedCost: true } }),
  ]);
  const healthScore = Math.round(Math.max(0, Math.min(100, 100 - (avgFail._avg.failureRate || 0) - (failed / Math.max(total, 1)) * 20)));
  res.json({ total, active, failed, inactive, paused, healthScore, totalCost: totalCost._sum.estimatedCost || 0, avgFailureRate: avgFail._avg.failureRate || 0 });
});

app.get('/api/analytics/by-tool', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const data = await prisma.automation.groupBy({ by: ['toolName'], where: { userId: req.userId }, _count: { id: true } });
  res.json(data.map(d => ({ toolName: d.toolName, count: d._count.id })));
});

app.get('/api/analytics/execution-history', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const days = parseInt((req.query.days as string) || '30');
  const since = new Date(); since.setDate(since.getDate() - days);
  const logs = await prisma.healthLog.findMany({ where: { createdAt: { gte: since }, automation: { userId: req.userId } }, select: { status: true, createdAt: true } });
  const byDay: Record<string, { success: number; failure: number; date: string }> = {};
  for (const log of logs) {
    const day = log.createdAt.toISOString().split('T')[0];
    if (!byDay[day]) byDay[day] = { success: 0, failure: 0, date: day };
    if (log.status === 'SUCCESS') byDay[day].success++; else byDay[day].failure++;
  }
  res.json(Object.values(byDay));
});

app.get('/api/analytics/top', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const data = await prisma.automation.findMany({ where: { userId: req.userId }, orderBy: { executionCount: 'desc' }, take: 10, select: { id: true, automationName: true, toolName: true, executionCount: true, failureRate: true, estimatedCost: true, status: true } });
  res.json(data);
});

// ─── Routes: AI Insights ──────────────────────────────────────────────────────
app.get('/api/insights', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const insights = await prisma.aiInsight.findMany({ where: { dismissed: false, automation: { userId: req.userId } }, include: { automation: { select: { automationName: true, toolName: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(insights);
});

app.post('/api/insights/analyze/full', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const uid = req.userId!;
  await aiDetectDuplicates(uid);
  await aiDetectOrphans(uid);
  await aiDetectBottlenecks(uid);
  await aiEstimateCosts(uid);
  res.json({ message: 'Full AI analysis completed' });
});

app.post('/api/insights/analyze', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  await aiQueue.add('ai', { userId: req.userId, type: req.body.type || 'full' });
  res.json({ message: 'Analysis queued' });
});

app.get('/api/insights/graph-intelligence', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const result = await aiGraphIntelligence(req.userId!);
  res.json(result);
});

app.put('/api/insights/:id/dismiss', authenticate, async (req: Request, res: Response): Promise<void> => {
  await prisma.aiInsight.update({ where: { id: req.params.id as string }, data: { dismissed: true } });
  res.json({ message: 'Dismissed' });
});

// ─── Routes: Discovery ────────────────────────────────────────────────────────
app.post('/api/discovery/ingest', authenticate, async (req: AuthReq, res: Response): Promise<void> => {
  const { format, data } = req.body;
  const items = Array.isArray(data) ? data : [data];
  const created = [];

  for (const item of items) {
    let payload: Record<string, unknown>;
    if (format === 'zapier') {
      payload = { automationName: item.title || 'Imported Zap', toolName: 'Zapier', owner: 'Imported', trigger: { app: item.steps?.find((s: Record<string, string>) => s.type === 'trigger')?.app || 'Zapier' }, actions: (item.steps || []).filter((s: Record<string, string>) => s.type === 'action'), status: item.status === 'on' ? 'ACTIVE' : 'INACTIVE' };
    } else if (format === 'power-automate') {
      const p = item.properties || {};
      payload = { automationName: p.displayName || 'Imported Flow', toolName: 'Power Automate', owner: 'Imported', trigger: Object.values(p.triggers || {})[0] || { type: 'unknown' }, actions: Object.values(p.actions || {}) };
    } else {
      payload = { automationName: item.name || 'Imported', toolName: item.tool || 'Custom', owner: item.owner || 'Imported', trigger: item.trigger || { type: 'manual' }, actions: item.actions || [], dependencies: item.dependencies || [], tags: item.tags || [], description: item.description };
    }
    const auto = await prisma.automation.create({ data: { ...payload, userId: req.userId!, dependencies: (payload.dependencies as string[]) || [], tags: (payload.tags as string[]) || [] } as Parameters<typeof prisma.automation.create>[0]['data'] });
    await saveVersion(auto.id, auto as unknown as Record<string, unknown>, 'Imported');
    await emitEvent('automation.created', { ...auto, userId: req.userId! });
    created.push(auto);
  }
  res.status(201).json({ message: `Imported ${created.length} automation(s)`, automations: created });
});

// ─── Start ────────────────────────────────────────────────────────────────────
initWorkers();

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, async () => {
  logger.info(`FlowScope API on port ${PORT}`);
  try { await prisma.$connect(); logger.info('Database connected'); }
  catch (e) { logger.error('DB connect failed', e); }
});

export default app;
