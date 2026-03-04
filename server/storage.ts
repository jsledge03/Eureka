import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  identities, goals, habits, tasks, completionLogs,
  quarterPlans, weeklyCheckIns, dailyRhythms, appSettings,
  type Identity, type InsertIdentity,
  type Goal, type InsertGoal,
  type Habit, type InsertHabit,
  type Task, type InsertTask,
  type CompletionLog, type InsertCompletionLog,
  type QuarterPlan, type InsertQuarterPlan,
  type WeeklyCheckIn, type InsertWeeklyCheckIn,
  type DailyRhythm, type InsertDailyRhythm,
} from "@shared/schema";

export interface IStorage {
  getIdentities(): Promise<Identity[]>;
  createIdentity(data: InsertIdentity): Promise<Identity>;
  updateIdentity(id: string, data: Partial<InsertIdentity>): Promise<Identity | undefined>;
  deleteIdentity(id: string): Promise<void>;

  getGoals(): Promise<Goal[]>;
  createGoal(data: InsertGoal): Promise<Goal>;
  updateGoal(id: string, data: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<void>;

  getHabits(): Promise<Habit[]>;
  createHabit(data: InsertHabit): Promise<Habit>;
  updateHabit(id: string, data: Partial<InsertHabit>): Promise<Habit | undefined>;
  deleteHabit(id: string): Promise<void>;

  getTasks(): Promise<Task[]>;
  createTask(data: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  getLogs(): Promise<CompletionLog[]>;
  createLog(data: InsertCompletionLog): Promise<CompletionLog>;
  upsertLog(data: InsertCompletionLog): Promise<CompletionLog>;

  getQuarterPlans(): Promise<QuarterPlan[]>;
  createQuarterPlan(data: InsertQuarterPlan): Promise<QuarterPlan>;
  updateQuarterPlan(id: string, data: Partial<InsertQuarterPlan>): Promise<QuarterPlan | undefined>;
  deleteQuarterPlan(id: string): Promise<void>;

  getWeeklyCheckIns(): Promise<WeeklyCheckIn[]>;
  createWeeklyCheckIn(data: InsertWeeklyCheckIn): Promise<WeeklyCheckIn>;

  getDailyRhythms(): Promise<DailyRhythm[]>;
  upsertDailyRhythm(data: InsertDailyRhythm): Promise<DailyRhythm>;

  getSetting(key: string): Promise<any>;
  setSetting(key: string, value: any): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getIdentities() {
    return db.select().from(identities);
  }
  async createIdentity(data: InsertIdentity) {
    const [result] = await db.insert(identities).values(data).returning();
    return result;
  }
  async updateIdentity(id: string, data: Partial<InsertIdentity>) {
    const [result] = await db.update(identities).set(data).where(eq(identities.id, id)).returning();
    return result;
  }
  async deleteIdentity(id: string) {
    await db.delete(identities).where(eq(identities.id, id));
  }

  async getGoals() {
    return db.select().from(goals);
  }
  async createGoal(data: InsertGoal) {
    const [result] = await db.insert(goals).values(data).returning();
    return result;
  }
  async updateGoal(id: string, data: Partial<InsertGoal>) {
    const [result] = await db.update(goals).set(data).where(eq(goals.id, id)).returning();
    return result;
  }
  async deleteGoal(id: string) {
    await db.delete(goals).where(eq(goals.id, id));
  }

  async getHabits() {
    return db.select().from(habits);
  }
  async createHabit(data: InsertHabit) {
    const [result] = await db.insert(habits).values(data).returning();
    return result;
  }
  async updateHabit(id: string, data: Partial<InsertHabit>) {
    const [result] = await db.update(habits).set(data).where(eq(habits.id, id)).returning();
    return result;
  }
  async deleteHabit(id: string) {
    await db.delete(habits).where(eq(habits.id, id));
  }

  async getTasks() {
    return db.select().from(tasks);
  }
  async createTask(data: InsertTask) {
    const [result] = await db.insert(tasks).values(data).returning();
    return result;
  }
  async updateTask(id: string, data: Partial<InsertTask>) {
    const [result] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return result;
  }
  async deleteTask(id: string) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getLogs() {
    return db.select().from(completionLogs);
  }
  async createLog(data: InsertCompletionLog) {
    const [result] = await db.insert(completionLogs).values(data).returning();
    return result;
  }
  async upsertLog(data: InsertCompletionLog) {
    const existing = await db.select().from(completionLogs)
      .where(and(eq(completionLogs.refId, data.refId), eq(completionLogs.date, data.date)));
    if (existing.length > 0) {
      const [result] = await db.update(completionLogs).set(data)
        .where(eq(completionLogs.id, existing[0].id)).returning();
      return result;
    }
    return this.createLog(data);
  }

  async getQuarterPlans() {
    return db.select().from(quarterPlans);
  }
  async createQuarterPlan(data: InsertQuarterPlan) {
    const [result] = await db.insert(quarterPlans).values(data).returning();
    return result;
  }
  async updateQuarterPlan(id: string, data: Partial<InsertQuarterPlan>) {
    const [result] = await db.update(quarterPlans).set(data).where(eq(quarterPlans.id, id)).returning();
    return result;
  }
  async deleteQuarterPlan(id: string) {
    await db.delete(quarterPlans).where(eq(quarterPlans.id, id));
  }

  async getWeeklyCheckIns() {
    return db.select().from(weeklyCheckIns);
  }
  async createWeeklyCheckIn(data: InsertWeeklyCheckIn) {
    const [result] = await db.insert(weeklyCheckIns).values(data).returning();
    return result;
  }

  async getDailyRhythms() {
    return db.select().from(dailyRhythms);
  }
  async upsertDailyRhythm(data: InsertDailyRhythm) {
    const existing = await db.select().from(dailyRhythms).where(eq(dailyRhythms.date, data.date));
    if (existing.length > 0) {
      const merged = { ...existing[0], ...data };
      const [result] = await db.update(dailyRhythms).set(merged).where(eq(dailyRhythms.date, data.date)).returning();
      return result;
    }
    const [result] = await db.insert(dailyRhythms).values(data).returning();
    return result;
  }

  async getSetting(key: string) {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return rows.length > 0 ? rows[0].value : undefined;
  }
  async setSetting(key: string, value: any) {
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (existing.length > 0) {
      await db.update(appSettings).set({ value }).where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, value });
    }
  }
}

export const storage = new DatabaseStorage();
