import type { Identity, Goal, Habit, Task, CompletionLog, DailyRhythm } from '@/store/useStore';
import type { SeasonMode } from '@/lib/seasonEngine';
import { getSeasonDefaults } from '@/lib/seasonEngine';

export type DriftLevel = 'Low' | 'Medium' | 'High';
export type DriftActionType = 'simplify-habit' | 'reschedule' | 'pause-goal' | 'reduce-goals' | 'create-cleanup-task' | 'add-reminder' | 'add-boundary';

export interface DriftAction {
  label: string;
  actionType: DriftActionType;
  targetId?: string;
  payload?: any;
}

export interface DriftAlert {
  id: string;
  type: 'domain' | 'identity-goal' | 'reflection' | 'integrity' | 'commitment' | 'overdue';
  level: DriftLevel;
  title: string;
  description: string;
  whyItMatters: string;
  likelyCause: string;
  actions: DriftAction[];
}

interface StoreSnapshot {
  identities: Identity[];
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  logs: CompletionLog[];
  dailyRhythms: Record<string, DailyRhythm>;
}

function getDates(daysBack: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < daysBack; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA'));
  }
  return dates;
}

export function computeDriftAlerts(store: StoreSnapshot, seasonMode?: SeasonMode): DriftAlert[] {
  const alerts: DriftAlert[] = [];
  const last7 = getDates(7);
  const last7Set = new Set(last7);
  const recentLogs = store.logs.filter(l => last7Set.has(l.date));
  const activeIdentities = store.identities.filter(i => i.isActive);
  if (activeIdentities.length === 0 && store.identities.length > 0) activeIdentities.push(store.identities[0]);
  const mergedEmphasis: Record<string, number> = {};
  activeIdentities.forEach(id => {
    if (id.domainEmphasis) {
      Object.entries(id.domainEmphasis).forEach(([d, w]) => {
        mergedEmphasis[d] = Math.max(mergedEmphasis[d] || 0, w);
      });
    }
  });
  const mergedIdentity = activeIdentities[0] ? { ...activeIdentities[0], domainEmphasis: mergedEmphasis } : undefined;

  detectDomainDrift(store, mergedIdentity, recentLogs, last7, alerts);
  detectIdentityGoalDrift(store, activeIdentities, recentLogs, alerts);
  detectReflectionDrift(store, last7, alerts);
  detectOverloadDrift(store, last7, alerts);
  detectCommitmentDrift(store, recentLogs, alerts);
  detectOverdueDrift(store, last7, alerts);

  alerts.sort((a, b) => {
    const levelOrder = { High: 0, Medium: 1, Low: 2 };
    return levelOrder[a.level] - levelOrder[b.level];
  });

  if (seasonMode) {
    const sensitivity = getSeasonDefaults(seasonMode).driftSensitivity;
    const filtered = sensitivity < 0.5
      ? alerts.filter(a => a.level === 'High')
      : sensitivity < 0.7
      ? alerts.filter(a => a.level !== 'Low')
      : alerts;
    return filtered.slice(0, 3);
  }

  return alerts.slice(0, 3);
}

function detectDomainDrift(
  store: StoreSnapshot,
  identity: Identity | undefined,
  recentLogs: CompletionLog[],
  last7: string[],
  alerts: DriftAlert[]
) {
  if (!identity?.domainEmphasis) return;

  const emphasis = identity.domainEmphasis;
  const emphasizedDomains = Object.entries(emphasis).filter(([, w]) => w >= 2).map(([d]) => d);

  const isRecovering = last7.filter(d => {
    const r = store.dailyRhythms[d];
    return r?.capacity === 'Recover';
  }).length >= 4;

  for (const domain of emphasizedDomains) {
    if (isRecovering) continue;

    const domainHabits = store.habits.filter(h => h.domain === domain && !h.isPaused);
    const domainTasks = store.tasks.filter(t => t.domain === domain && !t.completed);

    const completedLogs = recentLogs.filter(l => {
      const habit = store.habits.find(h => h.id === l.refId);
      const task = store.tasks.find(t => t.id === l.refId);
      return ((habit?.domain === domain) || (task?.domain === domain)) && (l.status === 'completed' || l.status === 'micro');
    });

    if ((domainHabits.length > 0 || domainTasks.length > 0) && completedLogs.length === 0) {
      alerts.push({
        id: `domain-drift-${domain}`,
        type: 'domain',
        level: 'Medium',
        title: `${domain} needs attention`,
        description: `Zero ${domain} actions completed this week despite it being a priority domain.`,
        whyItMatters: `${domain} is emphasized in your identity — neglecting it creates misalignment between who you're becoming and what you're doing.`,
        likelyCause: 'Capacity constraints, friction in the routine, or too many competing priorities.',
        actions: [
          ...(domainHabits.length > 0 ? [{ label: `Simplify a ${domain} habit`, actionType: 'simplify-habit' as const, targetId: domainHabits[0].id }] : []),
          { label: 'Create a 15-min focus sprint', actionType: 'create-cleanup-task' as const, payload: { domain, title: `15-min ${domain} sprint`, energy: 'Low' } },
        ],
      });
    }
  }
}

function detectIdentityGoalDrift(
  store: StoreSnapshot,
  activeIdentities: Identity[],
  recentLogs: CompletionLog[],
  alerts: DriftAlert[]
) {
  for (const identity of activeIdentities) {
    const linkedGoals = store.goals.filter(g => g.identityId === identity.id && !g.isPaused);
    if (linkedGoals.length === 0) continue;

    const goalIds = new Set(linkedGoals.map(g => g.id));
    const linkedHabits = store.habits.filter(h => h.goalId && goalIds.has(h.goalId) && !h.isPaused);
    const linkedTasks = store.tasks.filter(t => t.goalId && goalIds.has(t.goalId));

    if (linkedHabits.length === 0 && linkedTasks.length === 0) continue;

    const linkedItemIds = new Set([...linkedHabits.map(h => h.id), ...linkedTasks.map(t => t.id)]);
    const completedLogs = recentLogs.filter(l =>
      linkedItemIds.has(l.refId) && (l.status === 'completed' || l.status === 'micro')
    );
    const totalItems = linkedHabits.length + linkedTasks.length;
    const completionRate = completedLogs.length / Math.max(1, totalItems * 7);

    if (completedLogs.length === 0) {
      const stmtPreview = identity.statement.length > 30 ? identity.statement.slice(0, 30) + '…' : identity.statement;
      alerts.push({
        id: `identity-goal-drift-${identity.id}`,
        type: 'identity-goal',
        level: 'Medium',
        title: `"${stmtPreview}" goals stalling`,
        description: `${linkedGoals.length} goal${linkedGoals.length > 1 ? 's' : ''} linked to this identity, but zero actions completed this week.`,
        whyItMatters: `Your goals under "${stmtPreview}" connect directly to who you're becoming — inactivity here means your identity isn't being reinforced.`,
        likelyCause: 'Goals may lack supporting habits, or linked habits have too much friction.',
        actions: [
          ...(linkedHabits.length > 0 ? [{ label: 'Simplify a linked habit', actionType: 'simplify-habit' as const, targetId: linkedHabits[0].id }] : []),
          { label: 'Review goals', actionType: 'reduce-goals' as const },
        ],
      });
    } else if (completionRate < 0.15 && totalItems >= 3) {
      const stmtPreview = identity.statement.length > 30 ? identity.statement.slice(0, 30) + '…' : identity.statement;
      alerts.push({
        id: `identity-goal-drift-${identity.id}`,
        type: 'identity-goal',
        level: 'Low',
        title: `"${stmtPreview}" losing momentum`,
        description: `Only ${completedLogs.length} action${completedLogs.length > 1 ? 's' : ''} completed across ${totalItems} items linked to this identity.`,
        whyItMatters: `Low activity on identity-linked goals weakens the connection between your daily actions and who you're becoming.`,
        likelyCause: 'Spread too thin across identities, or these items need lower friction.',
        actions: [
          { label: 'Focus on one linked goal', actionType: 'reduce-goals' as const },
        ],
      });
    }
  }
}

function detectReflectionDrift(
  store: StoreSnapshot,
  last7: string[],
  alerts: DriftAlert[]
) {
  const reflectionCount = last7.filter(d => {
    const r = store.dailyRhythms[d];
    return r?.reflection && (r.reflection.wins || r.reflection.friction || r.reflection.lesson);
  }).length;

  if (reflectionCount < 2) {
    alerts.push({
      id: 'reflection-drift',
      type: 'reflection',
      level: reflectionCount === 0 ? 'Medium' : 'Low',
      title: 'Reflection is fading',
      description: `Close the Loop completed only ${reflectionCount} time${reflectionCount !== 1 ? 's' : ''} this week.`,
      whyItMatters: 'Without reflection, patterns go unseen and small issues become big ones. Reflection is how you steer.',
      likelyCause: 'Evening fatigue, forgotten routine, or the prompt feels too long.',
      actions: [
        { label: 'Add evening reminder', actionType: 'add-reminder' as const, payload: { type: 'close-the-loop' } },
      ],
    });
  }
}

function detectOverloadDrift(
  store: StoreSnapshot,
  last7: string[],
  alerts: DriftAlert[]
) {
  const overloadDays = last7.filter(d => {
    const r = store.dailyRhythms[d];
    if (!r) return false;
    const isLowEnergy = r.energy <= 2;
    const isRecoverMode = r.capacity === 'Recover';
    if (!isLowEnergy && !isRecoverMode) return false;
    const dayLogs = store.logs.filter(l => l.date === d);
    const hasMicro = dayLogs.some(l => l.status === 'micro');
    return !hasMicro && dayLogs.length > 3;
  }).length;

  if (overloadDays >= 3) {
    const topHabit = store.habits.find(h => !h.isPaused && !h.fallback && h.isKeystone)
      || store.habits.find(h => !h.isPaused && !h.fallback);
    alerts.push({
      id: 'overload-drift',
      type: 'integrity',
      level: 'Medium',
      title: 'Pushing through low-energy days',
      description: `${overloadDays} constrained days this week without using Minimum Versions or reducing scope.`,
      whyItMatters: 'Sustainable identity requires matching commitments to capacity. Overload erodes trust in your own system.',
      likelyCause: 'Unrealistic expectations, difficulty letting go of tasks, or missing Minimum Version options.',
      actions: [
        ...(topHabit ? [{ label: 'Add Minimum Version to top habit', actionType: 'simplify-habit' as const, targetId: topHabit.id }] : []),
        { label: 'Reduce active goals', actionType: 'reduce-goals' as const },
      ],
    });
  }
}

function detectCommitmentDrift(
  store: StoreSnapshot,
  recentLogs: CompletionLog[],
  alerts: DriftAlert[]
) {
  const activeHabits = store.habits.filter(h => !h.isPaused);

  for (const habit of activeHabits) {
    const habitLogs = recentLogs.filter(l => l.refId === habit.id);
    const missedCount = habitLogs.filter(l => l.status === 'skipped').length;
    const completedCount = habitLogs.filter(l => l.status === 'completed' || l.status === 'micro').length;
    const usedGrace = habitLogs.some(l => l.status === 'grace');
    const hasAdapted = habit.fallback || habit.isPaused || usedGrace;

    if (missedCount >= 3 && completedCount <= 1 && !hasAdapted) {
      alerts.push({
        id: `commitment-drift-${habit.id}`,
        type: 'commitment',
        level: 'Medium',
        title: `"${habit.title}" needs redesign`,
        description: `Missed ${missedCount} times this week without adapting (no Minimum Version, pause, or reschedule).`,
        whyItMatters: 'Repeated misses without adaptation signal a system design issue, not a willpower issue.',
        likelyCause: 'The cue might be wrong, the difficulty too high, or the schedule doesn\'t match your real energy patterns.',
        actions: [
          { label: 'Add a Minimum Version', actionType: 'simplify-habit' as const, targetId: habit.id },
          { label: 'Reschedule to a better time', actionType: 'reschedule' as const, targetId: habit.id },
        ],
      });
      break;
    }
  }
}

function detectOverdueDrift(
  store: StoreSnapshot,
  last7: string[],
  alerts: DriftAlert[]
) {
  const today = new Date().toLocaleDateString('en-CA');
  const overdueTasks = store.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);

  const weekAgo = last7[last7.length - 1];
  const overdueLastWeek = store.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < weekAgo);
  const isGrowing = overdueTasks.length > overdueLastWeek.length;

  if (overdueTasks.length > 3 && isGrowing) {
    alerts.push({
      id: 'overdue-drift',
      type: 'overdue',
      level: overdueTasks.length >= 8 ? 'High' : 'Medium',
      title: `${overdueTasks.length} overdue and growing`,
      description: `Your backlog grew from ${overdueLastWeek.length} to ${overdueTasks.length} tasks this week.`,
      whyItMatters: 'An overflowing backlog creates mental weight that drains energy and undermines confidence.',
      likelyCause: 'Too many commitments, unclear priorities, or tasks that should be deferred or deleted.',
      actions: [
        { label: 'Create a 15-min cleanup sprint', actionType: 'create-cleanup-task' as const, payload: { title: 'Overdue cleanup sprint', energy: 'Low' } },
        { label: 'Reduce active goals', actionType: 'reduce-goals' as const },
      ],
    });
  } else if (overdueTasks.length >= 5) {
    alerts.push({
      id: 'overdue-drift',
      type: 'overdue',
      level: 'Low',
      title: `${overdueTasks.length} overdue actions`,
      description: 'Your backlog is significant but stable. A quick triage can clear the mental weight.',
      whyItMatters: 'Even stable backlogs drain energy when they stay visible.',
      likelyCause: 'Tasks that are no longer relevant or priorities that shifted.',
      actions: [
        { label: 'Create a 15-min cleanup sprint', actionType: 'create-cleanup-task' as const, payload: { title: 'Overdue cleanup sprint', energy: 'Low' } },
      ],
    });
  }
}

export function getOverallDriftLevel(alerts: DriftAlert[]): DriftLevel {
  if (alerts.length === 0) return 'Low';
  const highCount = alerts.filter(a => a.level === 'High').length;
  const mediumCount = alerts.filter(a => a.level === 'Medium').length;
  if (highCount >= 2) return 'High';
  if (highCount >= 1 && mediumCount >= 1) return 'High';
  if (mediumCount >= 3) return 'High';
  if (highCount >= 1 || mediumCount >= 2) return 'Medium';
  if (mediumCount >= 1) return 'Medium';
  return 'Low';
}
