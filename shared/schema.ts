import { pgTable, text, varchar, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const identities = pgTable("identities", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  statement: text("statement").notNull(),
  futureSelf: text("future_self").notNull().default(""),
  values: text("values").array().notNull().default(sql`'{}'::text[]`),
  isActive: boolean("is_active").notNull().default(false),
  refuseStatement: text("refuse_statement").notNull().default(""),
  characterCommitments: text("character_commitments").array().notNull().default(sql`'{}'::text[]`),
  domainEmphasis: jsonb("domain_emphasis"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  intention: text("intention").notNull().default(""),
  identityId: varchar("identity_id", { length: 64 }),
  domain: text("domain"),
  targetProgress: integer("target_progress").notNull().default(100),
  currentProgress: integer("current_progress").notNull().default(0),
  isManualProgress: boolean("is_manual_progress").notNull().default(false),
  isPaused: boolean("is_paused").notNull().default(false),
});

export const habits = pgTable("habits", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  why: text("why").notNull().default(""),
  trigger: text("trigger").notNull().default(""),
  fallback: text("fallback").notNull().default(""),
  schedule: text("schedule").notNull().default("Daily"),
  difficulty: integer("difficulty").notNull().default(2),
  isKeystone: boolean("is_keystone").notNull().default(false),
  frictionNote: text("friction_note").notNull().default(""),
  cueNote: text("cue_note").notNull().default(""),
  goalId: varchar("goal_id", { length: 64 }),
  domain: text("domain"),
  isMicro: boolean("is_micro").notNull().default(false),
  isPaused: boolean("is_paused").notNull().default(false),
});

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  energy: text("energy").notNull().default("Medium"),
  emotion: text("emotion").notNull().default(""),
  completed: boolean("completed").notNull().default(false),
  habitId: varchar("habit_id", { length: 64 }),
  goalId: varchar("goal_id", { length: 64 }),
  domain: text("domain"),
  dueDate: text("due_date"),
  priority: text("priority").notNull().default("Medium"),
  label: text("label").notNull().default(""),
  labels: text("labels").array().default(sql`'{}'::text[]`),
});

export const completionLogs = pgTable("completion_logs", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  refId: varchar("ref_id", { length: 64 }).notNull(),
  date: text("date").notNull(),
  status: text("status").notNull(),
});

export const quarterPlans = pgTable("quarter_plans", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),
  theme: text("theme").notNull().default(""),
  constraints: text("constraints").array().notNull().default(sql`'{}'::text[]`),
  notToDo: text("not_to_do").array().notNull().default(sql`'{}'::text[]`),
  outcomes: text("outcomes").array().notNull().default(sql`'{}'::text[]`),
  focusDomains: text("focus_domains").array().notNull().default(sql`'{}'::text[]`),
});

export const weeklyCheckIns = pgTable("weekly_check_ins", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(),
  energy: text("energy").notNull().default("Sustain"),
  mood: text("mood").notNull().default(""),
  capacity: integer("capacity").notNull().default(5),
  worked: text("worked").notNull().default(""),
  slipped: text("slipped").notNull().default(""),
  adjustment: text("adjustment").notNull().default(""),
});

export const dailyRhythms = pgTable("daily_rhythms", {
  date: text("date").primaryKey(),
  energy: integer("energy").notNull().default(3),
  mood: text("mood").notNull().default(""),
  capacity: text("capacity").notNull().default("Sustain"),
  topOutcomes: text("top_outcomes").array().notNull().default(sql`'{}'::text[]`),
  reflection: jsonb("reflection"),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const insertIdentitySchema = createInsertSchema(identities).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true });
export const insertHabitSchema = createInsertSchema(habits).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertCompletionLogSchema = createInsertSchema(completionLogs).omit({ id: true });
export const insertQuarterPlanSchema = createInsertSchema(quarterPlans).omit({ id: true });
export const insertWeeklyCheckInSchema = createInsertSchema(weeklyCheckIns).omit({ id: true });
export const insertDailyRhythmSchema = createInsertSchema(dailyRhythms);

export type Identity = typeof identities.$inferSelect;
export type InsertIdentity = z.infer<typeof insertIdentitySchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type CompletionLog = typeof completionLogs.$inferSelect;
export type InsertCompletionLog = z.infer<typeof insertCompletionLogSchema>;
export type QuarterPlan = typeof quarterPlans.$inferSelect;
export type InsertQuarterPlan = z.infer<typeof insertQuarterPlanSchema>;
export type WeeklyCheckIn = typeof weeklyCheckIns.$inferSelect;
export type InsertWeeklyCheckIn = z.infer<typeof insertWeeklyCheckInSchema>;
export type DailyRhythm = typeof dailyRhythms.$inferSelect;
export type InsertDailyRhythm = z.infer<typeof insertDailyRhythmSchema>;
