import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { type SeasonMode, getSeasonDefaults } from '@/lib/seasonEngine';
import { generateProofEvent } from '@/lib/proofEngine';
export type { SeasonMode } from '@/lib/seasonEngine';

export type Domain = 'Physical' | 'Emotional' | 'Mental' | 'Social' | 'Spiritual' | 'Career' | 'Financial';
export const DOMAINS: Domain[] = ['Physical', 'Emotional', 'Mental', 'Social', 'Spiritual', 'Career', 'Financial'];

export interface Identity {
  id: string;
  statement: string;
  futureSelf: string;
  values: string[];
  isActive: boolean;
  refuseStatement: string;
  characterCommitments: string[];
  domainEmphasis: Record<string, number> | null;
}

export interface Goal {
  id: string;
  title: string;
  intention: string;
  identityId: string | null;
  domain: Domain | null;
  targetProgress: number;
  currentProgress: number;
  isManualProgress: boolean;
  isPaused: boolean;
}

export interface Habit {
  id: string;
  title: string;
  why: string;
  trigger: string;
  fallback: string;
  schedule: string;
  difficulty: number;
  isKeystone: boolean;
  frictionNote: string;
  cueNote: string;
  goalId: string | null;
  domain: Domain | null;
  isMicro: boolean;
  isPaused: boolean;
}

export interface Task {
  id: string;
  title: string;
  energy: string;
  emotion: string;
  completed: boolean;
  habitId: string | null;
  goalId: string | null;
  domain: Domain | null;
  dueDate: string | null;
  priority: string;
  label: string;
  labels: string[];
}

export interface CompletionLog {
  id: string;
  type: 'habit' | 'task';
  refId: string;
  date: string;
  status: 'completed' | 'skipped' | 'micro' | 'grace';
}

export interface QuarterPlan {
  id: string;
  year: number;
  quarter: number;
  theme: string;
  constraints: string[];
  notToDo: string[];
  outcomes: string[];
  focusDomains: Domain[];
}

export interface DailyRhythm {
  date: string;
  energy: number;
  mood: string;
  capacity: 'Push' | 'Sustain' | 'Recover';
  topOutcomes: string[];
  reflection?: {
    wins: string;
    friction: string;
    lesson: string;
    alignment: number;
  };
}

export interface WeeklyCheckIn {
  id: string;
  date: string;
  energy: 'Push' | 'Sustain' | 'Recover';
  mood: string;
  capacity: number;
  worked: string;
  slipped: string;
  adjustment: string;
}

export type ReasonTag = 'Time' | 'Energy' | 'Environment' | 'Emotion' | 'Overload' | 'Forgetfulness' | 'Unclear';

export interface FrictionEvent {
  id: string;
  entityType: 'habit' | 'task';
  entityId: string;
  entityTitle: string;
  dateKey: string;
  reasonTag: ReasonTag;
  note: string;
  context: {
    timeOfDay: string;
    dayOfWeek: string;
    energy: number;
    season: string;
  };
}

export type ProofSource = 'habit-completion' | 'goal-task' | 'wise-adaptation' | 'sunday-reset' | 'close-the-loop' | 'triage' | 'streak-milestone';

export interface ProofEvent {
  id: string;
  dateKey: string;
  title: string;
  linkedGoalId?: string;
  linkedHabitId?: string;
  linkedTaskId?: string;
  domain?: string;
  whyItMatters: string;
  source: ProofSource;
}

export type ReminderType = 'my-day-start' | 'midday-recalibrate' | 'close-the-loop' | 'sunday-reset' | 'daily-overdue';

export interface ReminderSchedule {
  type: ReminderType;
  enabled: boolean;
  time: string;
}

export interface CoachNudge {
  id: string;
  type: 'overdue' | 'rhythm-drop' | 'grace-usage' | 'domain-drift' | 'reminder' | 'progress';
  title: string;
  message: string;
  createdAt: string;
  dismissed: boolean;
  snoozedUntil?: string;
  reminderEventId?: string;
}

export type ReminderEventStatus = 'fired' | 'done' | 'snoozed' | 'missed';

export interface ReminderEvent {
  id: string;
  templateType: ReminderType | 'test' | 'progress';
  name: string;
  message: string;
  firedAt: string;
  status: ReminderEventStatus;
  completedAt?: string;
  dateKey: string;
  nudgeId?: string;
}

export interface StrictModeConfig {
  enabled: boolean;
  pausedUntil: string | null;
  goalCap: number;
  dailyTaskCap: number;
}

export const DEFAULT_STRICT_MODE: StrictModeConfig = {
  enabled: false,
  pausedUntil: null,
  goalCap: 3,
  dailyTaskCap: 5,
};

export type FrictionPromptFrequency = 'off' | 'light' | 'normal';

export interface NotificationSettings {
  inAppReminders: boolean;
  pushEnabled: boolean;
  maxNudgesPerOpen: number;
  lastNudgeDate: string;
  schedules: ReminderSchedule[];
  frictionPromptFrequency: FrictionPromptFrequency;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  inAppReminders: true,
  pushEnabled: false,
  maxNudgesPerOpen: 1,
  lastNudgeDate: '',
  frictionPromptFrequency: 'normal',
  schedules: [
    { type: 'my-day-start', enabled: true, time: '07:00' },
    { type: 'midday-recalibrate', enabled: false, time: '12:00' },
    { type: 'close-the-loop', enabled: false, time: '21:00' },
    { type: 'sunday-reset', enabled: true, time: '09:00' },
    { type: 'daily-overdue', enabled: false, time: '10:00' },
  ],
};

export type DashboardWidgetId = 'rhythm-score' | 'grace-bank' | 'momentum' | 'today-habits' | 'today-tasks' | 'overdue-tasks' | 'goal-progress' | 'weekly-focus' | 'north-star' | 'identity-alignment';

export interface DashboardWidget {
  id: DashboardWidgetId;
  visible: boolean;
}

export type CoachSectionId = 'identity' | 'forecast' | 'advisory' | 'strict-mode' | 'narrative' | 'drift' | 'gravity' | 'friction' | 'streaks' | 'proof' | 'evidence' | 'strategic-plan' | 'suggestions' | 'reminders' | 'alignment' | 'trajectory' | 'upgrades';

export interface SectionConfig {
  id: string;
  visible: boolean;
}

export const DEFAULT_COACH_SECTIONS: SectionConfig[] = [
  { id: 'identity', visible: true },
  { id: 'forecast', visible: true },
  { id: 'advisory', visible: true },
  { id: 'strict-mode', visible: true },
  { id: 'narrative', visible: true },
  { id: 'drift', visible: true },
  { id: 'gravity', visible: true },
  { id: 'friction', visible: true },
  { id: 'streaks', visible: true },
  { id: 'proof', visible: true },
  { id: 'evidence', visible: true },
  { id: 'strategic-plan', visible: true },
  { id: 'suggestions', visible: true },
  { id: 'reminders', visible: true },
  { id: 'alignment', visible: true },
  { id: 'trajectory', visible: true },
  { id: 'upgrades', visible: true },
];

export type ReviewSectionId = 'goals' | 'system-load' | 'domain-allocation' | 'weekly-memo';

export const DEFAULT_REVIEW_SECTIONS: SectionConfig[] = [
  { id: 'goals', visible: true },
  { id: 'system-load', visible: true },
  { id: 'domain-allocation', visible: true },
  { id: 'weekly-memo', visible: true },
];

export type HomeSectionId = 'alerts' | 'backlog' | 'triage' | 'habits' | 'recovery' | 'tasks';

export const DEFAULT_HOME_SECTIONS: SectionConfig[] = [
  { id: 'alerts', visible: true },
  { id: 'backlog', visible: true },
  { id: 'triage', visible: true },
  { id: 'habits', visible: true },
  { id: 'recovery', visible: true },
  { id: 'tasks', visible: true },
];

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'north-star', visible: true },
  { id: 'rhythm-score', visible: true },
  { id: 'grace-bank', visible: true },
  { id: 'momentum', visible: true },
  { id: 'today-habits', visible: true },
  { id: 'today-tasks', visible: true },
  { id: 'overdue-tasks', visible: true },
  { id: 'goal-progress', visible: true },
  { id: 'weekly-focus', visible: true },
  { id: 'identity-alignment', visible: true },
];

interface AppState {
  identities: Identity[];
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  logs: CompletionLog[];
  quarterPlans: QuarterPlan[];
  weeklyCheckIns: WeeklyCheckIn[];
  dailyRhythms: Record<string, DailyRhythm>;
  currentQuarterKey: string;
  graceDaysPerWeek: number;
  graceDaysUsedThisWeek: number;
  taskLabels: string[];
  hydrated: boolean;
  dashboardWidgets: DashboardWidget[];
  coachSections: SectionConfig[];
  reviewSections: SectionConfig[];
  homeSections: SectionConfig[];
  notificationSettings: NotificationSettings;
  coachNudges: CoachNudge[];
  reminderEvents: ReminderEvent[];
  frictionEvents: FrictionEvent[];
  frictionPromptShownToday: string;
  proofEvents: ProofEvent[];
  celebratedMilestones: Record<string, number[]>;
  celebratedMilestoneHistory: Record<string, Array<{ days: number; date: string }>>;
  firedReminderKeys: Record<string, string[]>;
  driftSnoozedUntil: string | null;
  seasonMode: SeasonMode;
  seasonStartDate: string;
  seasonNotes: string;
  strictMode: StrictModeConfig;
  commitmentBudgetBase: number;
  strategicIntent: string;
  advisoryMode: 'reflective' | 'executive';

  systemUpgrades: {
    keystoneMode: boolean;
    energyScheduling: boolean;
    frictionAudit: boolean;
    identityAlignment: boolean;
    focusMode: boolean;
  };

  hydrateFromServer: () => Promise<void>;

  addIdentity: (identity: Omit<Identity, 'id'>) => void;
  updateIdentity: (id: string, identity: Partial<Identity>) => void;
  deleteIdentity: (id: string) => void;
  setActiveIdentity: (id: string) => void;
  toggleIdentityActive: (id: string) => void;
  getActiveIdentity: () => Identity | undefined;
  getActiveIdentities: () => Identity[];

  addGoal: (goal: Omit<Goal, 'id' | 'targetProgress' | 'currentProgress' | 'isManualProgress' | 'isPaused'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string, cascade?: boolean) => void;

  addHabit: (habit: Omit<Habit, 'id' | 'isPaused'>) => void;
  updateHabit: (id: string, habit: Partial<Habit>) => void;
  deleteHabit: (id: string, cascade?: boolean) => void;

  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addQuarterPlan: (plan: Omit<QuarterPlan, 'id'>) => void;
  updateQuarterPlan: (id: string, plan: Partial<QuarterPlan>) => void;
  deleteQuarterPlan: (id: string) => void;
  setCurrentQuarter: (key: string) => void;
  cloneQuarter: (fromId: string, toYear: number, toQuarter: number) => void;

  addWeeklyCheckIn: (checkIn: Omit<WeeklyCheckIn, 'id'>) => void;
  saveDailyRhythm: (date: string, rhythm: Partial<DailyRhythm>) => void;

  logCompletion: (log: Omit<CompletionLog, 'id'>) => void;
  applyGrace: (refId: string, type: 'habit' | 'task', date: string) => void;
  setGraceConfig: (days: number) => void;
  updateSystemUpgrade: (key: keyof AppState['systemUpgrades'], value: boolean) => void;
  addTaskLabel: (label: string) => void;
  removeTaskLabel: (label: string) => void;
  renameTaskLabel: (oldName: string, newName: string) => void;
  setDashboardWidgets: (widgets: DashboardWidget[]) => void;
  toggleDashboardWidget: (id: DashboardWidgetId) => void;
  moveDashboardWidget: (id: DashboardWidgetId, direction: 'up' | 'down') => void;
  toggleSectionVisibility: (page: 'coach' | 'review' | 'home', id: string) => void;
  moveSection: (page: 'coach' | 'review' | 'home', id: string, direction: 'up' | 'down') => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  updateReminderSchedule: (type: ReminderType, updates: Partial<ReminderSchedule>) => void;
  addCoachNudge: (nudge: Omit<CoachNudge, 'id' | 'createdAt' | 'dismissed'>) => string;
  dismissNudge: (id: string) => void;
  snoozeNudge: (id: string, until: string) => void;
  clearOldNudges: () => void;
  addReminderEvent: (event: Omit<ReminderEvent, 'id'>) => string;
  completeReminderEvent: (eventId: string) => void;
  removeReminderEvent: (eventId: string) => void;
  getReminderEventsToday: () => ReminderEvent[];
  cleanupReminderEvents: () => void;
  addFrictionEvent: (event: Omit<FrictionEvent, 'id'>) => void;
  setFrictionPromptShown: (dateKey: string) => void;
  addProofEvent: (event: Omit<ProofEvent, 'id'>) => void;
  markMilestoneCelebrated: (habitId: string, days: number) => void;
  isMilestoneCelebrated: (habitId: string, days: number) => boolean;
  snoozeDriftAlerts: () => void;
  isDriftSnoozed: () => boolean;
  cleanupStore: () => void;
  setSeasonMode: (mode: SeasonMode) => void;
  setSeasonNotes: (notes: string) => void;
  setStrictMode: (updates: Partial<StrictModeConfig>) => void;
  toggleStrictMode: () => void;
  pauseStrictMode24h: () => void;
  isStrictModeActive: () => boolean;
  setCommitmentBudgetBase: (n: number) => void;
  setStrategicIntent: (intent: string) => void;
  setAdvisoryMode: (mode: 'reflective' | 'executive') => void;
  colorTheme: 'auto' | 'morning' | 'day' | 'evening' | 'night';
  setColorTheme: (theme: 'auto' | 'morning' | 'day' | 'evening' | 'night') => void;
}

const defaultQuarterKey = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      identities: [],
      goals: [],
      habits: [],
      tasks: [],
      logs: [],
      quarterPlans: [],
      weeklyCheckIns: [],
      dailyRhythms: {},
      currentQuarterKey: defaultQuarterKey,
      graceDaysPerWeek: 3,
      graceDaysUsedThisWeek: 0,
      taskLabels: ['Deep Work', 'Recovery', 'Reflection', 'Fitness', 'Nutrition', 'Social', 'Spiritual', 'Career', 'Finance', 'Personal', 'Coach', 'Household'],
      hydrated: false,
      dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
      coachSections: DEFAULT_COACH_SECTIONS,
      reviewSections: DEFAULT_REVIEW_SECTIONS,
      homeSections: DEFAULT_HOME_SECTIONS,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      coachNudges: [],
      reminderEvents: [],
      frictionEvents: [],
      frictionPromptShownToday: '',
      firedReminderKeys: {},
      proofEvents: [],
      celebratedMilestones: {},
      celebratedMilestoneHistory: {},
      driftSnoozedUntil: null,
      seasonMode: 'Build' as SeasonMode,
      seasonStartDate: new Date().toLocaleDateString('en-CA'),
      seasonNotes: '',
      strictMode: { ...DEFAULT_STRICT_MODE },
      commitmentBudgetBase: 100,
      strategicIntent: '',
      advisoryMode: 'reflective' as 'reflective' | 'executive',
      colorTheme: 'auto' as 'auto' | 'morning' | 'day' | 'evening' | 'night',
      systemUpgrades: {
        keystoneMode: false,
        energyScheduling: false,
        frictionAudit: false,
        identityAlignment: false,
        focusMode: false
      },

      hydrateFromServer: async () => {
        try {
          const state = await api.getState();
          set({
            identities: state.identities.map((i: any) => ({
              id: i.id,
              statement: i.statement,
              futureSelf: i.futureSelf ?? i.future_self ?? "",
              values: i.values ?? [],
              isActive: i.isActive ?? i.is_active ?? false,
              refuseStatement: i.refuseStatement ?? i.refuse_statement ?? "",
              characterCommitments: i.characterCommitments ?? i.character_commitments ?? [],
              domainEmphasis: i.domainEmphasis ?? i.domain_emphasis ?? null,
            })),
            goals: state.goals.map((g: any) => ({
              id: g.id,
              title: g.title,
              intention: g.intention ?? "",
              identityId: g.identityId ?? g.identity_id ?? null,
              domain: g.domain ?? null,
              targetProgress: g.targetProgress ?? g.target_progress ?? 100,
              currentProgress: g.currentProgress ?? g.current_progress ?? 0,
              isManualProgress: g.isManualProgress ?? g.is_manual_progress ?? false,
              isPaused: g.isPaused ?? g.is_paused ?? false,
            })),
            habits: state.habits.map((h: any) => ({
              id: h.id,
              title: h.title,
              why: h.why ?? "",
              trigger: h.trigger ?? "",
              fallback: h.fallback ?? "",
              schedule: h.schedule ?? "Daily",
              difficulty: h.difficulty ?? 2,
              isKeystone: h.isKeystone ?? h.is_keystone ?? false,
              frictionNote: h.frictionNote ?? h.friction_note ?? "",
              cueNote: h.cueNote ?? h.cue_note ?? "",
              goalId: h.goalId ?? h.goal_id ?? null,
              domain: h.domain ?? null,
              isMicro: h.isMicro ?? h.is_micro ?? false,
              isPaused: h.isPaused ?? h.is_paused ?? false,
            })),
            tasks: state.tasks.map((t: any) => {
              const legacyLabel = t.label ?? "";
              const labelsArr: string[] = Array.isArray(t.labels) && t.labels.length > 0
                ? t.labels
                : legacyLabel ? [legacyLabel] : [];
              return {
                id: t.id,
                title: t.title,
                energy: t.energy ?? "Medium",
                emotion: t.emotion ?? "",
                completed: t.completed ?? false,
                habitId: t.habitId ?? t.habit_id ?? null,
                goalId: t.goalId ?? t.goal_id ?? null,
                domain: t.domain ?? null,
                dueDate: t.dueDate ?? t.due_date ?? null,
                priority: t.priority ?? "Medium",
                label: legacyLabel,
                labels: labelsArr,
              };
            }),
            logs: state.logs.map((l: any) => ({
              id: l.id,
              type: l.type,
              refId: l.refId ?? l.ref_id,
              date: l.date,
              status: l.status,
            })),
            quarterPlans: state.quarterPlans.map((p: any) => ({
              id: p.id,
              year: p.year,
              quarter: p.quarter,
              theme: p.theme ?? "",
              constraints: p.constraints ?? [],
              notToDo: p.notToDo ?? p.not_to_do ?? [],
              outcomes: p.outcomes ?? [],
              focusDomains: p.focusDomains ?? p.focus_domains ?? [],
            })),
            weeklyCheckIns: state.weeklyCheckIns ?? [],
            dailyRhythms: Object.fromEntries(
              Object.entries(state.dailyRhythms ?? {}).map(([k, v]: [string, any]) => [k, {
                date: v.date ?? k,
                energy: v.energy ?? 3,
                mood: v.mood ?? "",
                capacity: v.capacity ?? "Sustain",
                topOutcomes: v.topOutcomes ?? v.top_outcomes ?? [],
                reflection: v.reflection ?? undefined,
              }])
            ),
            currentQuarterKey: state.currentQuarterKey ?? defaultQuarterKey,
            graceDaysPerWeek: state.graceDaysPerWeek ?? 3,
            graceDaysUsedThisWeek: state.graceDaysUsedThisWeek ?? 0,
            taskLabels: state.taskLabels ?? get().taskLabels,
            systemUpgrades: state.systemUpgrades ?? get().systemUpgrades,
            seasonMode: state.seasonMode ?? get().seasonMode,
            seasonStartDate: state.seasonStartDate ?? get().seasonStartDate,
            seasonNotes: state.seasonNotes ?? get().seasonNotes,
            strategicIntent: state.strategicIntent ?? get().strategicIntent,
            advisoryMode: state.advisoryMode ?? get().advisoryMode,
            colorTheme: state.colorTheme ?? get().colorTheme,
            strictMode: state.strictMode ? { ...DEFAULT_STRICT_MODE, ...state.strictMode } : get().strictMode,
            commitmentBudgetBase: state.commitmentBudgetBase ?? get().commitmentBudgetBase,
            hydrated: true,
          });
        } catch (e) {
          console.warn("Failed to hydrate from server, using local state", e);
          set({ hydrated: true });
        }
      },

      addIdentity: (identity) => {
        const id = crypto.randomUUID();
        const full = { ...identity, id };
        set((state) => ({ identities: [...state.identities, full] }));
        api.createIdentity({
          statement: identity.statement,
          futureSelf: identity.futureSelf ?? "",
          values: identity.values ?? [],
          isActive: identity.isActive ?? false,
          refuseStatement: identity.refuseStatement ?? "",
          characterCommitments: identity.characterCommitments ?? [],
          domainEmphasis: identity.domainEmphasis ?? null,
        }).then(res => {
          set(s => ({ identities: s.identities.map(i => i.id === id ? { ...i, id: res.id } : i) }));
        }).catch(console.error);
      },
      updateIdentity: (id, updated) => {
        set((state) => ({ identities: state.identities.map((i) => i.id === id ? { ...i, ...updated } : i) }));
        const dbData: any = {};
        if (updated.statement !== undefined) dbData.statement = updated.statement;
        if (updated.futureSelf !== undefined) dbData.futureSelf = updated.futureSelf;
        if (updated.values !== undefined) dbData.values = updated.values;
        if (updated.isActive !== undefined) dbData.isActive = updated.isActive;
        if (updated.refuseStatement !== undefined) dbData.refuseStatement = updated.refuseStatement;
        if (updated.characterCommitments !== undefined) dbData.characterCommitments = updated.characterCommitments;
        if (updated.domainEmphasis !== undefined) dbData.domainEmphasis = updated.domainEmphasis;
        api.updateIdentity(id, dbData).catch(console.error);
      },
      deleteIdentity: (id) => {
        const goalsToUnlink = get().goals.filter(g => g.identityId === id);
        set((state) => ({
          identities: state.identities.filter((i) => i.id !== id),
          goals: state.goals.map(g => g.identityId === id ? { ...g, identityId: null } : g)
        }));
        goalsToUnlink.forEach(g => {
          api.updateGoal(g.id, { identityId: null }).catch(console.error);
        });
        api.deleteIdentity(id).catch(console.error);
      },
      setActiveIdentity: (id) => {
        set((state) => ({
          identities: state.identities.map(i => ({ ...i, isActive: i.id === id }))
        }));
        const { identities } = get();
        identities.forEach(i => {
          api.updateIdentity(i.id, { isActive: i.id === id }).catch(console.error);
        });
      },
      toggleIdentityActive: (id) => {
        const identity = get().identities.find(i => i.id === id);
        if (!identity) return;
        const newActive = !identity.isActive;
        const activeCount = get().identities.filter(i => i.isActive).length;
        if (!newActive && activeCount <= 1) {
          return;
        }
        set((state) => ({
          identities: state.identities.map(i => i.id === id ? { ...i, isActive: newActive } : i)
        }));
        api.updateIdentity(id, { isActive: newActive }).catch(console.error);
      },
      getActiveIdentity: () => {
        return get().identities.find(i => i.isActive) || get().identities[0];
      },
      getActiveIdentities: () => {
        const active = get().identities.filter(i => i.isActive);
        return active.length > 0 ? active : get().identities.slice(0, 1);
      },

      addGoal: (goal) => {
        const id = crypto.randomUUID();
        const full = { ...goal, id, targetProgress: 100, currentProgress: 0, isManualProgress: false, isPaused: false };
        set((state) => ({ goals: [...state.goals, full] }));
        api.createGoal({
          title: goal.title, intention: goal.intention ?? "",
          identityId: goal.identityId ?? null, domain: goal.domain ?? null,
          targetProgress: 100, currentProgress: 0, isManualProgress: false, isPaused: false
        }).then(res => {
          set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, id: res.id } : g) }));
        }).catch(console.error);
      },
      updateGoal: (id, updated) => {
        set((state) => ({ goals: state.goals.map((g) => g.id === id ? { ...g, ...updated } : g) }));
        const dbData: any = {};
        if (updated.title !== undefined) dbData.title = updated.title;
        if (updated.intention !== undefined) dbData.intention = updated.intention;
        if (updated.identityId !== undefined) dbData.identityId = updated.identityId;
        if (updated.domain !== undefined) dbData.domain = updated.domain;
        if (updated.isPaused !== undefined) dbData.isPaused = updated.isPaused;
        if (updated.currentProgress !== undefined) dbData.currentProgress = updated.currentProgress;
        if (updated.targetProgress !== undefined) dbData.targetProgress = updated.targetProgress;
        if (updated.isManualProgress !== undefined) dbData.isManualProgress = updated.isManualProgress;
        api.updateGoal(id, dbData).catch(console.error);
      },
      deleteGoal: (id, cascade = false) => {
        set((state) => {
          if (cascade) {
            const habitIds = state.habits.filter(h => h.goalId === id).map(h => h.id);
            const taskIds = state.tasks.filter(t => t.goalId === id).map(t => t.id);
            habitIds.forEach(hid => api.deleteHabit(hid).catch(console.error));
            taskIds.forEach(tid => api.deleteTask(tid).catch(console.error));
            return {
              goals: state.goals.filter((g) => g.id !== id),
              habits: state.habits.filter((h) => h.goalId !== id),
              tasks: state.tasks.filter((t) => t.goalId !== id)
            };
          }
          return {
            goals: state.goals.filter((g) => g.id !== id),
            habits: state.habits.map(h => h.goalId === id ? { ...h, goalId: null } : h),
            tasks: state.tasks.map(t => t.goalId === id ? { ...t, goalId: null } : t),
          };
        });
        api.deleteGoal(id).catch(console.error);
      },

      addHabit: (habit) => {
        const id = crypto.randomUUID();
        const full = { ...habit, id, isPaused: false };
        set((state) => ({ habits: [...state.habits, full] }));
        api.createHabit({
          title: habit.title, why: habit.why ?? "", trigger: habit.trigger ?? "",
          fallback: habit.fallback ?? "", schedule: habit.schedule ?? "Daily",
          difficulty: habit.difficulty ?? 2, isKeystone: habit.isKeystone ?? false,
          frictionNote: habit.frictionNote ?? "", cueNote: habit.cueNote ?? "",
          goalId: habit.goalId ?? null, domain: habit.domain ?? null,
          isMicro: habit.isMicro ?? false, isPaused: false
        }).then(res => {
          set(s => ({ habits: s.habits.map(h => h.id === id ? { ...h, id: res.id } : h) }));
        }).catch(console.error);
      },
      updateHabit: (id, updated) => {
        set((state) => ({ habits: state.habits.map((h) => h.id === id ? { ...h, ...updated } : h) }));
        const dbData: any = {};
        if (updated.title !== undefined) dbData.title = updated.title;
        if (updated.why !== undefined) dbData.why = updated.why;
        if (updated.trigger !== undefined) dbData.trigger = updated.trigger;
        if (updated.fallback !== undefined) dbData.fallback = updated.fallback;
        if (updated.schedule !== undefined) dbData.schedule = updated.schedule;
        if (updated.difficulty !== undefined) dbData.difficulty = updated.difficulty;
        if (updated.isKeystone !== undefined) dbData.isKeystone = updated.isKeystone;
        if (updated.frictionNote !== undefined) dbData.frictionNote = updated.frictionNote;
        if (updated.cueNote !== undefined) dbData.cueNote = updated.cueNote;
        if (updated.goalId !== undefined) dbData.goalId = updated.goalId;
        if (updated.domain !== undefined) dbData.domain = updated.domain;
        if (updated.isMicro !== undefined) dbData.isMicro = updated.isMicro;
        if (updated.isPaused !== undefined) dbData.isPaused = updated.isPaused;
        api.updateHabit(id, dbData).catch(console.error);
      },
      deleteHabit: (id, cascade = false) => {
        set((state) => {
          if (cascade) {
            const taskIds = state.tasks.filter(t => t.habitId === id).map(t => t.id);
            taskIds.forEach(tid => api.deleteTask(tid).catch(console.error));
            return {
              habits: state.habits.filter((h) => h.id !== id),
              tasks: state.tasks.filter((t) => t.habitId !== id)
            };
          }
          return {
            habits: state.habits.filter((h) => h.id !== id),
            tasks: state.tasks.map(t => t.habitId === id ? { ...t, habitId: null } : t),
          };
        });
        api.deleteHabit(id).catch(console.error);
      },

      cleanupStore: () => set((state) => {
        const goalIds = new Set(state.goals.map(g => g.id));
        const habitIds = new Set(state.habits.map(h => h.id));
        const identityIds = new Set(state.identities.map(i => i.id));
        return {
          goals: state.goals.map(g => ({
            ...g, identityId: g.identityId && identityIds.has(g.identityId) ? g.identityId : null
          })),
          habits: state.habits.map(h => ({
            ...h, goalId: h.goalId && goalIds.has(h.goalId) ? h.goalId : null
          })),
          tasks: state.tasks.map(t => ({
            ...t,
            goalId: t.goalId && goalIds.has(t.goalId) ? t.goalId : null,
            habitId: t.habitId && habitIds.has(t.habitId) ? t.habitId : null
          }))
        };
      }),

      addTask: (task) => {
        const id = crypto.randomUUID();
        const taskLabels = task.labels ?? (task.label ? [task.label] : []);
        const full = { ...task, id, labels: taskLabels, label: taskLabels[0] ?? "" };
        set((state) => ({ tasks: [...state.tasks, full] }));
        api.createTask({
          title: task.title, energy: task.energy ?? "Medium", emotion: task.emotion ?? "",
          completed: task.completed ?? false, habitId: task.habitId ?? null,
          goalId: task.goalId ?? null, domain: task.domain ?? null,
          dueDate: task.dueDate ?? null, priority: task.priority ?? "Medium",
          label: taskLabels[0] ?? "", labels: taskLabels
        }).then(res => {
          set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, id: res.id } : t) }));
        }).catch(console.error);
      },
      updateTask: (id, updated) => {
        const merged = { ...updated };
        if (merged.labels !== undefined) {
          merged.label = merged.labels[0] ?? "";
        }
        set((state) => ({ tasks: state.tasks.map((t) => t.id === id ? { ...t, ...merged } : t) }));
        const dbData: any = {};
        if (merged.title !== undefined) dbData.title = merged.title;
        if (merged.energy !== undefined) dbData.energy = merged.energy;
        if (merged.emotion !== undefined) dbData.emotion = merged.emotion;
        if (merged.completed !== undefined) dbData.completed = merged.completed;
        if (merged.habitId !== undefined) dbData.habitId = merged.habitId;
        if (merged.goalId !== undefined) dbData.goalId = merged.goalId;
        if (merged.domain !== undefined) dbData.domain = merged.domain;
        if (merged.dueDate !== undefined) dbData.dueDate = merged.dueDate;
        if (merged.priority !== undefined) dbData.priority = merged.priority;
        if (merged.label !== undefined) dbData.label = merged.label;
        if (merged.labels !== undefined) dbData.labels = merged.labels;
        api.updateTask(id, dbData).catch(console.error);
      },
      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        api.deleteTask(id).catch(console.error);
      },

      addQuarterPlan: (plan) => {
        const id = crypto.randomUUID();
        const full = { ...plan, id };
        set((state) => ({ quarterPlans: [...state.quarterPlans, full] }));
        api.createQuarterPlan({
          year: plan.year, quarter: plan.quarter, theme: plan.theme ?? "",
          constraints: plan.constraints ?? [], notToDo: plan.notToDo ?? [],
          outcomes: plan.outcomes ?? [], focusDomains: plan.focusDomains ?? []
        }).then(res => {
          set(s => ({ quarterPlans: s.quarterPlans.map(p => p.id === id ? { ...p, id: res.id } : p) }));
        }).catch(console.error);
      },
      updateQuarterPlan: (id, updated) => {
        set((state) => ({ quarterPlans: state.quarterPlans.map((p) => p.id === id ? { ...p, ...updated } : p) }));
        const dbData: any = {};
        if (updated.theme !== undefined) dbData.theme = updated.theme;
        if (updated.constraints !== undefined) dbData.constraints = updated.constraints;
        if (updated.notToDo !== undefined) dbData.notToDo = updated.notToDo;
        if (updated.outcomes !== undefined) dbData.outcomes = updated.outcomes;
        if (updated.focusDomains !== undefined) dbData.focusDomains = updated.focusDomains;
        api.updateQuarterPlan(id, dbData).catch(console.error);
      },
      deleteQuarterPlan: (id) => {
        set((state) => ({ quarterPlans: state.quarterPlans.filter((p) => p.id !== id) }));
        api.deleteQuarterPlan(id).catch(console.error);
      },
      setCurrentQuarter: (key) => {
        set({ currentQuarterKey: key });
        api.setSetting("currentQuarterKey", key).catch(console.error);
      },
      cloneQuarter: (fromId, toYear, toQuarter) => set((state) => {
        const source = state.quarterPlans.find(p => p.id === fromId);
        if (!source) return state;
        const id = crypto.randomUUID();
        const newPlan = { ...source, id, year: toYear, quarter: toQuarter };
        api.createQuarterPlan({
          year: toYear, quarter: toQuarter, theme: source.theme,
          constraints: source.constraints, notToDo: source.notToDo,
          outcomes: source.outcomes, focusDomains: source.focusDomains
        }).then(res => {
          set(s => ({ quarterPlans: s.quarterPlans.map(p => p.id === id ? { ...p, id: res.id } : p) }));
        }).catch(console.error);
        return { quarterPlans: [...state.quarterPlans, newPlan] };
      }),

      addWeeklyCheckIn: (checkIn) => {
        const id = crypto.randomUUID();
        const full = { ...checkIn, id };
        set((state) => ({ weeklyCheckIns: [...state.weeklyCheckIns, full] }));
        api.createWeeklyCheckIn(checkIn).catch(console.error);
      },
      saveDailyRhythm: (date, rhythm) => {
        set((state) => {
          const existing = state.dailyRhythms[date] || { date, energy: 3, mood: '', capacity: 'Sustain' as const, topOutcomes: [] };
          const merged = { ...existing, ...rhythm };
          return { dailyRhythms: { ...state.dailyRhythms, [date]: merged } };
        });
        const current = get().dailyRhythms[date];
        if (current) {
          api.upsertDailyRhythm({
            date: current.date,
            energy: current.energy,
            mood: current.mood,
            capacity: current.capacity,
            topOutcomes: current.topOutcomes,
            reflection: current.reflection ?? null,
          }).catch(console.error);
        }
      },

      logCompletion: (log) => {
        set((state) => {
          const existing = state.logs.findIndex(l => l.refId === log.refId && l.date === log.date);
          if (existing >= 0) {
            const newLogs = [...state.logs];
            newLogs[existing] = { ...newLogs[existing], ...log };
            return { logs: newLogs };
          }
          return { logs: [...state.logs, { ...log, id: crypto.randomUUID() }] };
        });
        api.upsertLog(log).catch(console.error);

        if (log.status === 'completed') {
          const state = get();
          if (log.type === 'habit') {
            const habit = state.habits.find(h => h.id === log.refId);
            if (habit && habit.isKeystone) {
              const goal = habit.goalId ? state.goals.find(g => g.id === habit.goalId) : undefined;
              const proofEvent = generateProofEvent('habit-completion', {
                habitId: habit.id,
                habitTitle: habit.title,
                goalId: goal?.id,
                goalTitle: goal?.title,
                domain: habit.domain || undefined,
                isKeystone: true,
              }, state);
              get().addProofEvent(proofEvent);
            }
          } else if (log.type === 'task') {
            const task = state.tasks.find(t => t.id === log.refId);
            if (task && task.goalId) {
              const goal = state.goals.find(g => g.id === task.goalId);
              if (goal) {
                const proofEvent = generateProofEvent('goal-task', {
                  taskId: task.id,
                  taskTitle: task.title,
                  goalId: goal.id,
                  goalTitle: goal.title,
                  domain: task.domain || goal.domain || undefined,
                }, state);
                get().addProofEvent(proofEvent);
              }
            }
          }
        }
      },

      applyGrace: (refId, type, date) => set((state) => {
        if (state.graceDaysUsedThisWeek >= state.graceDaysPerWeek) return state;
        const log = { refId, type, date, status: 'grace' as const, id: crypto.randomUUID() };
        api.upsertLog({ type, refId, date, status: 'grace' }).catch(console.error);

        let newTasks = state.tasks;
        if (type === 'task') {
          newTasks = state.tasks.map(t => {
            if (t.id !== refId) return t;
            const newLabels = t.labels.includes('Recovery') ? t.labels : [...t.labels, 'Recovery'];
            return { ...t, labels: newLabels, label: newLabels[0] ?? '', dueDate: null };
          });
          const task = state.tasks.find(t => t.id === refId);
          const updatedLabels = task ? (task.labels.includes('Recovery') ? task.labels : [...task.labels, 'Recovery']) : ['Recovery'];
          api.updateTask(refId, { label: updatedLabels[0] ?? '', labels: updatedLabels, dueDate: null }).catch(console.error);
        }

        const newUsed = state.graceDaysUsedThisWeek + 1;
        api.setSetting("graceDaysUsedThisWeek", newUsed).catch(console.error);

        return { logs: [...state.logs, log], tasks: newTasks, graceDaysUsedThisWeek: newUsed };
      }),
      setGraceConfig: (days) => {
        set({ graceDaysPerWeek: days });
        api.setSetting("graceDaysPerWeek", days).catch(console.error);
      },
      updateSystemUpgrade: (key, value) => {
        set((state) => {
          const newUpgrades = { ...state.systemUpgrades, [key]: value };
          api.setSetting("systemUpgrades", newUpgrades).catch(console.error);
          return { systemUpgrades: newUpgrades };
        });
      },
      addTaskLabel: (label) => {
        set((state) => {
          const newLabels = state.taskLabels.includes(label) ? state.taskLabels : [...state.taskLabels, label];
          api.setSetting("taskLabels", newLabels).catch(console.error);
          return { taskLabels: newLabels };
        });
      },
      removeTaskLabel: (label) => {
        set((state) => {
          const newLabels = state.taskLabels.filter(l => l !== label);
          api.setSetting("taskLabels", newLabels).catch(console.error);
          const updatedTasks = state.tasks.map(t => {
            if (!t.labels.includes(label)) return t;
            const filtered = t.labels.filter(l => l !== label);
            api.updateTask(t.id, { labels: filtered, label: filtered[0] ?? "" }).catch(console.error);
            return { ...t, labels: filtered, label: filtered[0] ?? "" };
          });
          return { taskLabels: newLabels, tasks: updatedTasks };
        });
      },
      renameTaskLabel: (oldName, newName) => {
        set((state) => {
          const newLabels = state.taskLabels.map(l => l === oldName ? newName : l);
          api.setSetting("taskLabels", newLabels).catch(console.error);
          const updatedTasks = state.tasks.map(t => {
            if (!t.labels.includes(oldName)) return t;
            const renamed = t.labels.map(l => l === oldName ? newName : l);
            api.updateTask(t.id, { labels: renamed, label: renamed[0] ?? "" }).catch(console.error);
            return { ...t, labels: renamed, label: renamed[0] ?? "" };
          });
          return { taskLabels: newLabels, tasks: updatedTasks };
        });
      },
      setDashboardWidgets: (widgets) => set({ dashboardWidgets: widgets }),
      toggleDashboardWidget: (id) => {
        set((state) => ({
          dashboardWidgets: state.dashboardWidgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w),
        }));
      },
      moveDashboardWidget: (id, direction) => {
        set((state) => {
          const widgets = [...state.dashboardWidgets];
          const idx = widgets.findIndex(w => w.id === id);
          if (idx < 0) return state;
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= widgets.length) return state;
          [widgets[idx], widgets[swapIdx]] = [widgets[swapIdx], widgets[idx]];
          return { dashboardWidgets: widgets };
        });
      },
      toggleSectionVisibility: (page, id) => {
        set((state) => {
          const key = page === 'coach' ? 'coachSections' : page === 'review' ? 'reviewSections' : 'homeSections';
          return { [key]: state[key].map(s => s.id === id ? { ...s, visible: !s.visible } : s) };
        });
      },
      moveSection: (page, id, direction) => {
        set((state) => {
          const key = page === 'coach' ? 'coachSections' : page === 'review' ? 'reviewSections' : 'homeSections';
          const sections = [...state[key]];
          const idx = sections.findIndex(s => s.id === id);
          if (idx < 0) return state;
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= sections.length) return state;
          [sections[idx], sections[swapIdx]] = [sections[swapIdx], sections[idx]];
          return { [key]: sections };
        });
      },
      updateNotificationSettings: (settings) => {
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, ...settings },
        }));
      },
      updateReminderSchedule: (type, updates) => {
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            schedules: state.notificationSettings.schedules.map(s =>
              s.type === type ? { ...s, ...updates } : s
            ),
          },
        }));
      },
      addCoachNudge: (nudge) => {
        const id = crypto.randomUUID();
        const newNudge: CoachNudge = {
          ...nudge,
          id,
          createdAt: new Date().toISOString(),
          dismissed: false,
        };
        set((state) => ({
          coachNudges: [newNudge, ...state.coachNudges].slice(0, 50),
        }));
        return id;
      },
      dismissNudge: (id) => {
        const nudge = get().coachNudges.find(n => n.id === id);
        if (nudge?.reminderEventId) {
          get().completeReminderEvent(nudge.reminderEventId);
        }
        set((state) => ({
          coachNudges: state.coachNudges.map(n => n.id === id ? { ...n, dismissed: true } : n),
        }));
      },
      snoozeNudge: (id, until) => {
        set((state) => ({
          coachNudges: state.coachNudges.map(n => n.id === id ? { ...n, snoozedUntil: until } : n),
        }));
      },
      clearOldNudges: () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoff = sevenDaysAgo.toISOString();
        set((state) => ({
          coachNudges: state.coachNudges.filter(n => !n.dismissed || n.createdAt > cutoff),
        }));
      },
      addReminderEvent: (event) => {
        const id = crypto.randomUUID();
        set((state) => ({
          reminderEvents: [{ ...event, id }, ...state.reminderEvents].slice(0, 200),
        }));
        return id;
      },
      completeReminderEvent: (eventId) => {
        set((state) => ({
          reminderEvents: state.reminderEvents.map(e =>
            e.id === eventId ? { ...e, status: 'done' as const, completedAt: new Date().toISOString() } : e
          ),
        }));
      },
      removeReminderEvent: (eventId) => {
        set((state) => ({
          reminderEvents: state.reminderEvents.filter(e => e.id !== eventId),
        }));
      },
      getReminderEventsToday: () => {
        const today = new Date().toLocaleDateString('en-CA');
        return get().reminderEvents.filter(e => e.dateKey === today);
      },
      cleanupReminderEvents: () => {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const cutoff = fourteenDaysAgo.toLocaleDateString('en-CA');
        set((state) => ({
          reminderEvents: state.reminderEvents.filter(e => e.dateKey >= cutoff),
        }));
      },
      addFrictionEvent: (event) => {
        const id = crypto.randomUUID();
        const full: FrictionEvent = { ...event, id };
        set((state) => ({
          frictionEvents: [full, ...state.frictionEvents].slice(0, 500),
          frictionPromptShownToday: event.dateKey,
        }));
      },
      setFrictionPromptShown: (dateKey) => {
        set({ frictionPromptShownToday: dateKey });
      },
      addProofEvent: (event) => {
        const id = crypto.randomUUID();
        const full: ProofEvent = { ...event, id };
        set((state) => ({
          proofEvents: [full, ...state.proofEvents].slice(0, 500),
        }));
      },
      markMilestoneCelebrated: (habitId, days) => {
        set((state) => {
          const existing = state.celebratedMilestones[habitId] || [];
          if (existing.includes(days)) return state;
          const existingHistory = state.celebratedMilestoneHistory[habitId] || [];
          return {
            celebratedMilestones: {
              ...state.celebratedMilestones,
              [habitId]: [...existing, days],
            },
            celebratedMilestoneHistory: {
              ...state.celebratedMilestoneHistory,
              [habitId]: [...existingHistory, { days, date: new Date().toLocaleDateString('en-CA') }],
            },
          };
        });
      },
      isMilestoneCelebrated: (habitId, days) => {
        const milestones = get().celebratedMilestones[habitId] || [];
        return milestones.includes(days);
      },
      snoozeDriftAlerts: () => {
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        set({ driftSnoozedUntil: sevenDaysLater.toISOString() });
      },
      isDriftSnoozed: () => {
        const until = get().driftSnoozedUntil;
        if (!until) return false;
        return new Date(until) > new Date();
      },
      setSeasonMode: (mode) => {
        const defaults = getSeasonDefaults(mode);
        set({
          seasonMode: mode,
          seasonStartDate: new Date().toLocaleDateString('en-CA'),
          graceDaysPerWeek: defaults.graceDays,
        });
        api.setSetting("seasonMode", mode).catch(console.error);
        api.setSetting("seasonStartDate", new Date().toLocaleDateString('en-CA')).catch(console.error);
        api.setSetting("graceDaysPerWeek", defaults.graceDays).catch(console.error);
      },
      setSeasonNotes: (notes) => {
        set({ seasonNotes: notes });
        api.setSetting("seasonNotes", notes).catch(console.error);
      },
      setStrictMode: (updates) => {
        set((state) => {
          const newStrict = { ...state.strictMode, ...updates };
          api.setSetting("strictMode", newStrict).catch(console.error);
          return { strictMode: newStrict };
        });
      },
      toggleStrictMode: () => {
        set((state) => {
          const newStrict = { ...state.strictMode, enabled: !state.strictMode.enabled, pausedUntil: null };
          api.setSetting("strictMode", newStrict).catch(console.error);
          return { strictMode: newStrict };
        });
      },
      pauseStrictMode24h: () => {
        const pauseUntil = new Date();
        pauseUntil.setHours(pauseUntil.getHours() + 24);
        set((state) => {
          const newStrict = { ...state.strictMode, pausedUntil: pauseUntil.toISOString() };
          api.setSetting("strictMode", newStrict).catch(console.error);
          return { strictMode: newStrict };
        });
      },
      isStrictModeActive: () => {
        const sm = get().strictMode;
        if (!sm.enabled) return false;
        if (sm.pausedUntil && new Date(sm.pausedUntil) > new Date()) return false;
        return true;
      },
      setCommitmentBudgetBase: (n) => {
        set({ commitmentBudgetBase: n });
        api.setSetting("commitmentBudgetBase", n).catch(console.error);
      },
      setStrategicIntent: (intent) => {
        set({ strategicIntent: intent });
        api.setSetting("strategicIntent", intent).catch(console.error);
      },
      setAdvisoryMode: (mode) => {
        set({ advisoryMode: mode });
        api.setSetting("advisoryMode", mode).catch(console.error);
      },
      setColorTheme: (theme) => {
        set({ colorTheme: theme });
        api.setSetting("colorTheme", theme).catch(console.error);
      },
    }),
    {
      name: 'life-compass-storage',
      version: 4,
      partialize: (state) => {
        const { hydrated, ...rest } = state;
        return rest;
      },
      migrate: (persisted: any, version: number) => {
        if (version < 1) {
          persisted.seasonMode = persisted.seasonMode ?? 'Build';
          persisted.seasonStartDate = persisted.seasonStartDate ?? new Date().toLocaleDateString('en-CA');
          persisted.seasonNotes = persisted.seasonNotes ?? '';
          persisted.commitmentBudgetBase = persisted.commitmentBudgetBase ?? 100;
          persisted.strategicIntent = persisted.strategicIntent ?? '';
          persisted.advisoryMode = persisted.advisoryMode ?? 'reflective';
          persisted.frictionEvents = persisted.frictionEvents ?? [];
          persisted.proofEvents = persisted.proofEvents ?? [];
          persisted.celebratedMilestones = persisted.celebratedMilestones ?? {};
          persisted.celebratedMilestoneHistory = persisted.celebratedMilestoneHistory ?? {};
          persisted.firedReminderKeys = persisted.firedReminderKeys ?? {};
          persisted.driftSnoozedUntil = persisted.driftSnoozedUntil ?? null;
          persisted.systemUpgrades = persisted.systemUpgrades ?? {
            keystoneMode: false, energyScheduling: false,
            frictionAudit: false, identityAlignment: false, focusMode: false,
          };
        }
        if (version < 2) {
          persisted.dashboardWidgets = persisted.dashboardWidgets ?? DEFAULT_DASHBOARD_WIDGETS;
          persisted.coachSections = persisted.coachSections ?? DEFAULT_COACH_SECTIONS;
          persisted.reviewSections = persisted.reviewSections ?? DEFAULT_REVIEW_SECTIONS;
          persisted.homeSections = persisted.homeSections ?? DEFAULT_HOME_SECTIONS;
          persisted.strictMode = persisted.strictMode
            ? { ...DEFAULT_STRICT_MODE, ...persisted.strictMode }
            : { ...DEFAULT_STRICT_MODE };
          if (persisted.notificationSettings) {
            persisted.notificationSettings = {
              ...DEFAULT_NOTIFICATION_SETTINGS,
              ...persisted.notificationSettings,
            };
          }
        }
        if (version < 3) {
          if (Array.isArray(persisted.tasks)) {
            persisted.tasks = persisted.tasks.map((t: any) => ({
              ...t,
              labels: Array.isArray(t.labels) && t.labels.length > 0
                ? t.labels
                : t.label ? [t.label] : [],
            }));
          }
        }
        if (version < 4) {
          persisted.colorTheme = persisted.colorTheme ?? 'auto';
        }
        return persisted;
      },
    }
  )
);

const _sessionDismissals = new Set<string>();

export function dismissSessionNotification(key: string) {
  _sessionDismissals.add(key);
}

export function isSessionNotificationDismissed(key: string): boolean {
  return _sessionDismissals.has(key);
}

export function resetSessionDismissals() {
  _sessionDismissals.clear();
}
