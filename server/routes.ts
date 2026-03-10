import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertIdentitySchema,
  insertGoalSchema,
  insertHabitSchema,
  insertTaskSchema,
  insertCompletionLogSchema,
  insertQuarterPlanSchema,
  insertWeeklyCheckInSchema,
  insertDailyRhythmSchema,
} from "@shared/schema";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = new Error("Validation error: " + result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    (error as any).status = 400;
    throw error;
  }
  return result.data;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/identities", asyncHandler(async (_req, res) => {
    const data = await storage.getIdentities();
    res.json(data);
  }));
  app.post("/api/identities", asyncHandler(async (req, res) => {
    const data = validate(insertIdentitySchema, req.body);
    const result = await storage.createIdentity(data);
    res.status(201).json(result);
  }));
  app.patch("/api/identities/:id", asyncHandler(async (req, res) => {
    const result = await storage.updateIdentity(String(req.params.id), req.body);
    result ? res.json(result) : res.status(404).json({ message: "Not found" });
  }));
  app.delete("/api/identities/:id", asyncHandler(async (req, res) => {
    await storage.deleteIdentity(String(req.params.id));
    res.status(204).send();
  }));

  app.get("/api/goals", asyncHandler(async (_req, res) => {
    const data = await storage.getGoals();
    res.json(data);
  }));
  app.post("/api/goals", asyncHandler(async (req, res) => {
    const data = validate(insertGoalSchema, req.body);
    const result = await storage.createGoal(data);
    res.status(201).json(result);
  }));
  app.patch("/api/goals/:id", asyncHandler(async (req, res) => {
    const result = await storage.updateGoal(String(req.params.id), req.body);
    result ? res.json(result) : res.status(404).json({ message: "Not found" });
  }));
  app.delete("/api/goals/:id", asyncHandler(async (req, res) => {
    await storage.deleteGoal(String(req.params.id));
    res.status(204).send();
  }));

  app.get("/api/habits", asyncHandler(async (_req, res) => {
    const data = await storage.getHabits();
    res.json(data);
  }));
  app.post("/api/habits", asyncHandler(async (req, res) => {
    const data = validate(insertHabitSchema, req.body);
    const result = await storage.createHabit(data);
    res.status(201).json(result);
  }));
  app.patch("/api/habits/:id", asyncHandler(async (req, res) => {
    const result = await storage.updateHabit(String(req.params.id), req.body);
    result ? res.json(result) : res.status(404).json({ message: "Not found" });
  }));
  app.delete("/api/habits/:id", asyncHandler(async (req, res) => {
    await storage.deleteHabit(String(req.params.id));
    res.status(204).send();
  }));

  app.get("/api/tasks", asyncHandler(async (_req, res) => {
    const data = await storage.getTasks();
    res.json(data.map(t => ({ ...t, labels: t.labels ?? [] })));
  }));
  app.post("/api/tasks", asyncHandler(async (req, res) => {
    const data = validate(insertTaskSchema, req.body);
    const result = await storage.createTask(data);
    res.status(201).json(result);
  }));
  app.patch("/api/tasks/:id", asyncHandler(async (req, res) => {
    const result = await storage.updateTask(String(req.params.id), req.body);
    result ? res.json(result) : res.status(404).json({ message: "Not found" });
  }));
  app.delete("/api/tasks/:id", asyncHandler(async (req, res) => {
    await storage.deleteTask(String(req.params.id));
    res.status(204).send();
  }));

  app.get("/api/logs", asyncHandler(async (_req, res) => {
    const data = await storage.getLogs();
    res.json(data);
  }));
  app.post("/api/logs", asyncHandler(async (req, res) => {
    const data = validate(insertCompletionLogSchema, req.body);
    const result = await storage.upsertLog(data);
    res.status(201).json(result);
  }));

  app.get("/api/quarter-plans", asyncHandler(async (_req, res) => {
    const data = await storage.getQuarterPlans();
    res.json(data);
  }));
  app.post("/api/quarter-plans", asyncHandler(async (req, res) => {
    const data = validate(insertQuarterPlanSchema, req.body);
    const result = await storage.createQuarterPlan(data);
    res.status(201).json(result);
  }));
  app.patch("/api/quarter-plans/:id", asyncHandler(async (req, res) => {
    const result = await storage.updateQuarterPlan(String(req.params.id), req.body);
    result ? res.json(result) : res.status(404).json({ message: "Not found" });
  }));
  app.delete("/api/quarter-plans/:id", asyncHandler(async (req, res) => {
    await storage.deleteQuarterPlan(String(req.params.id));
    res.status(204).send();
  }));

  app.get("/api/weekly-check-ins", asyncHandler(async (_req, res) => {
    const data = await storage.getWeeklyCheckIns();
    res.json(data);
  }));
  app.post("/api/weekly-check-ins", asyncHandler(async (req, res) => {
    const data = validate(insertWeeklyCheckInSchema, req.body);
    const result = await storage.createWeeklyCheckIn(data);
    res.status(201).json(result);
  }));

  app.get("/api/daily-rhythms", asyncHandler(async (_req, res) => {
    const data = await storage.getDailyRhythms();
    res.json(data);
  }));
  app.post("/api/daily-rhythms", asyncHandler(async (req, res) => {
    const data = validate(insertDailyRhythmSchema, req.body);
    const result = await storage.upsertDailyRhythm(data);
    res.json(result);
  }));

  app.get("/api/settings/:key", asyncHandler(async (req, res) => {
    const value = await storage.getSetting(String(req.params.key));
    res.json({ value: value ?? null });
  }));
  app.post("/api/settings/:key", asyncHandler(async (req, res) => {
    const key = String(req.params.key);
    if (!key || key.length > 100) {
      res.status(400).json({ message: "Invalid setting key" });
      return;
    }
    if (req.body.value === undefined) {
      res.status(400).json({ message: "Missing value field" });
      return;
    }
    await storage.setSetting(key, req.body.value);
    res.json({ success: true });
  }));

  app.get("/api/state", asyncHandler(async (_req, res) => {
    const [idents, gls, habs, tsks, logs, qps, wcis, drs] = await Promise.all([
      storage.getIdentities(),
      storage.getGoals(),
      storage.getHabits(),
      storage.getTasks(),
      storage.getLogs(),
      storage.getQuarterPlans(),
      storage.getWeeklyCheckIns(),
      storage.getDailyRhythms(),
    ]);

    const [currentQuarterKey, graceDaysPerWeek, graceDaysUsedThisWeek, taskLabels, systemUpgrades, seasonMode, seasonStartDate, seasonNotes, strictMode, commitmentBudgetBase, strategicIntent, advisoryMode, customDomains, colorTheme] = await Promise.all([
      storage.getSetting("currentQuarterKey"),
      storage.getSetting("graceDaysPerWeek"),
      storage.getSetting("graceDaysUsedThisWeek"),
      storage.getSetting("taskLabels"),
      storage.getSetting("systemUpgrades"),
      storage.getSetting("seasonMode"),
      storage.getSetting("seasonStartDate"),
      storage.getSetting("seasonNotes"),
      storage.getSetting("strictMode"),
      storage.getSetting("commitmentBudgetBase"),
      storage.getSetting("strategicIntent"),
      storage.getSetting("advisoryMode"),
      storage.getSetting("customDomains"),
      storage.getSetting("colorTheme"),
    ]);

    const rhythmMap: Record<string, any> = {};
    drs.forEach(r => { rhythmMap[r.date] = r; });

    res.json({
      identities: idents,
      goals: gls,
      habits: habs,
      tasks: tsks,
      logs,
      quarterPlans: qps,
      weeklyCheckIns: wcis,
      dailyRhythms: rhythmMap,
      currentQuarterKey: currentQuarterKey ?? `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`,
      graceDaysPerWeek: graceDaysPerWeek ?? 3,
      graceDaysUsedThisWeek: graceDaysUsedThisWeek ?? 0,
      taskLabels: taskLabels ?? ['Deep Work', 'Recovery', 'Reflection', 'Fitness', 'Nutrition', 'Social', 'Spiritual', 'Career', 'Finance', 'Personal', 'Coach', 'Household'],
      systemUpgrades: systemUpgrades ?? { keystoneMode: false, energyScheduling: false, frictionAudit: false, identityAlignment: false, focusMode: false },
      seasonMode: seasonMode ?? null,
      seasonStartDate: seasonStartDate ?? null,
      seasonNotes: seasonNotes ?? null,
      strictMode: strictMode ?? null,
      commitmentBudgetBase: commitmentBudgetBase ?? null,
      strategicIntent: strategicIntent ?? null,
      advisoryMode: advisoryMode ?? null,
      customDomains: customDomains ?? [],
      colorTheme: colorTheme ?? null,
    });
  }));

  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    console.error("API Error:", err.message);
    res.status(status).json({ message: status === 400 ? err.message : "Internal server error", error: err.message });
  });

  return httpServer;
}
