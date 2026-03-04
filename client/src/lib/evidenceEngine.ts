import type { Identity, Goal, Habit, Task, CompletionLog, DailyRhythm } from '@/store/useStore';

export interface EvidenceItem {
  label: string;
  detail: string;
  domain?: string;
  count?: number;
  identityId?: string;
}

export interface GapItem {
  label: string;
  whyItMatters: string;
  fixAction: {
    label: string;
    actionType: 'create-task' | 'adjust-habit' | 'add-reflection' | 'navigate';
    payload?: any;
  };
}

interface StoreSnapshot {
  identities: Identity[];
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  logs: CompletionLog[];
  dailyRhythms: Record<string, DailyRhythm>;
}

function getWeekDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = d.toLocaleDateString('en-CA');
    if (dateStr <= new Date().toLocaleDateString('en-CA')) {
      dates.push(dateStr);
    }
  }
  return dates;
}

export function computeWeeklyEvidence(store: StoreSnapshot): { evidence: EvidenceItem[]; gaps: GapItem[] } {
  const weekDates = getWeekDates();
  const weekSet = new Set(weekDates);
  const weekLogs = store.logs.filter(l => weekSet.has(l.date));
  const evidence: EvidenceItem[] = [];
  const gaps: GapItem[] = [];

  const completedHabitLogs = weekLogs.filter(l => l.type === 'habit' && (l.status === 'completed' || l.status === 'micro'));
  const completedTaskLogs = weekLogs.filter(l => l.type === 'task' && l.status === 'completed');

  const domainCounts: Record<string, { habits: number; tasks: number }> = {};
  completedHabitLogs.forEach(l => {
    const habit = store.habits.find(h => h.id === l.refId);
    if (habit?.domain) {
      if (!domainCounts[habit.domain]) domainCounts[habit.domain] = { habits: 0, tasks: 0 };
      domainCounts[habit.domain].habits++;
    }
  });
  completedTaskLogs.forEach(l => {
    const task = store.tasks.find(t => t.id === l.refId);
    if (task?.domain) {
      if (!domainCounts[task.domain]) domainCounts[task.domain] = { habits: 0, tasks: 0 };
      domainCounts[task.domain].tasks++;
    }
  });

  Object.entries(domainCounts).forEach(([domain, counts]) => {
    const total = counts.habits + counts.tasks;
    if (total > 0) {
      const parts: string[] = [];
      if (counts.habits > 0) parts.push(`${counts.habits} habit${counts.habits > 1 ? 's' : ''}`);
      if (counts.tasks > 0) parts.push(`${counts.tasks} task${counts.tasks > 1 ? 's' : ''}`);
      evidence.push({
        label: `Completed ${total} ${domain} actions`,
        detail: parts.join(' + '),
        domain,
        count: total,
      });
    }
  });

  const keystoneCompleted = completedHabitLogs.filter(l => {
    const h = store.habits.find(h2 => h2.id === l.refId);
    return h?.isKeystone;
  }).length;
  if (keystoneCompleted > 0) {
    evidence.push({
      label: `${keystoneCompleted} keystone habit${keystoneCompleted > 1 ? 's' : ''} completed`,
      detail: 'These anchor your daily identity',
      count: keystoneCompleted,
    });
  }

  const activeIdentities = store.identities.filter(i => i.isActive);
  if (activeIdentities.length === 0 && store.identities.length > 0) activeIdentities.push(store.identities[0]);

  for (const identity of activeIdentities) {
    const linkedGoals = store.goals.filter(g => g.identityId === identity.id && !g.isPaused);
    if (linkedGoals.length === 0) continue;

    const goalIds = new Set(linkedGoals.map(g => g.id));
    const linkedHabitIds = new Set(store.habits.filter(h => h.goalId && goalIds.has(h.goalId)).map(h => h.id));
    const linkedTaskIds = new Set(store.tasks.filter(t => t.goalId && goalIds.has(t.goalId)).map(t => t.id));

    const identityCompletions = weekLogs.filter(l =>
      (linkedHabitIds.has(l.refId) || linkedTaskIds.has(l.refId)) &&
      (l.status === 'completed' || l.status === 'micro')
    ).length;

    if (identityCompletions > 0) {
      const stmtPreview = identity.statement.length > 40 ? identity.statement.slice(0, 40) + '…' : identity.statement;
      evidence.push({
        label: `${identityCompletions} action${identityCompletions > 1 ? 's' : ''} reinforcing "${stmtPreview}"`,
        detail: `Across ${linkedGoals.length} linked goal${linkedGoals.length > 1 ? 's' : ''}`,
        count: identityCompletions,
        identityId: identity.id,
      });
    }
  }

  const goalProgress = store.goals.filter(g => !g.isPaused && g.currentProgress > 0);
  if (goalProgress.length > 0) {
    evidence.push({
      label: `${goalProgress.length} goal${goalProgress.length > 1 ? 's' : ''} with progress`,
      detail: goalProgress.map(g => g.title).slice(0, 3).join(', '),
      count: goalProgress.length,
    });
  }

  const reflectionDays = weekDates.filter(d => {
    const r = store.dailyRhythms[d];
    return r?.reflection && (r.reflection.wins || r.reflection.friction);
  }).length;
  if (reflectionDays > 0) {
    evidence.push({
      label: `Reflected ${reflectionDays} day${reflectionDays > 1 ? 's' : ''}`,
      detail: 'Closing the loop builds self-awareness',
      count: reflectionDays,
    });
  }

  if (evidence.length === 0 && (completedHabitLogs.length > 0 || completedTaskLogs.length > 0)) {
    evidence.push({
      label: `${completedHabitLogs.length + completedTaskLogs.length} actions completed`,
      detail: 'Every action is evidence of who you\'re becoming',
      count: completedHabitLogs.length + completedTaskLogs.length,
    });
  }

  const mergedEmphasis: Record<string, number> = {};
  activeIdentities.forEach(id => {
    if (id.domainEmphasis) {
      Object.entries(id.domainEmphasis).forEach(([d, w]) => {
        mergedEmphasis[d] = Math.max(mergedEmphasis[d] || 0, w);
      });
    }
  });
  const emphasizedDomains = Object.entries(mergedEmphasis).filter(([, w]) => w >= 2).map(([d]) => d);

  emphasizedDomains.forEach(domain => {
    if (!domainCounts[domain] || (domainCounts[domain].habits + domainCounts[domain].tasks) === 0) {
      const domainHabits = store.habits.filter(h => h.domain === domain && !h.isPaused);
      gaps.push({
        label: `${domain} — no activity this week`,
        whyItMatters: `This domain is core to your identity but has zero engagement.`,
        fixAction: domainHabits.length > 0
          ? { label: `Start with a small ${domain} action`, actionType: 'adjust-habit', payload: { habitId: domainHabits[0].id } }
          : { label: `Create a ${domain} task`, actionType: 'create-task', payload: { domain, title: `Quick ${domain} action`, energy: 'Low' } },
      });
    }
  });

  if (reflectionDays < 2) {
    gaps.push({
      label: `Reflection skipped ${weekDates.length - reflectionDays} day${weekDates.length - reflectionDays !== 1 ? 's' : ''}`,
      whyItMatters: 'Without reflection, growth happens by accident instead of by design.',
      fixAction: { label: 'Close the Loop tonight', actionType: 'navigate', payload: { route: '/today' } },
    });
  }

  for (const identity of activeIdentities) {
    const linkedGoals = store.goals.filter(g => g.identityId === identity.id && !g.isPaused);
    if (linkedGoals.length === 0) continue;

    const goalIds = new Set(linkedGoals.map(g => g.id));
    const linkedHabitIds = new Set(store.habits.filter(h => h.goalId && goalIds.has(h.goalId)).map(h => h.id));
    const linkedTaskIds = new Set(store.tasks.filter(t => t.goalId && goalIds.has(t.goalId)).map(t => t.id));

    const identityCompletions = weekLogs.filter(l =>
      (linkedHabitIds.has(l.refId) || linkedTaskIds.has(l.refId)) &&
      (l.status === 'completed' || l.status === 'micro')
    ).length;

    if (identityCompletions === 0 && (linkedHabitIds.size > 0 || linkedTaskIds.size > 0)) {
      const stmtPreview = identity.statement.length > 30 ? identity.statement.slice(0, 30) + '…' : identity.statement;
      gaps.push({
        label: `"${stmtPreview}" — no linked activity`,
        whyItMatters: `You have ${linkedGoals.length} goal${linkedGoals.length > 1 ? 's' : ''} linked to this identity but zero completions this week.`,
        fixAction: { label: 'Review linked goals', actionType: 'navigate', payload: { route: '/identity' } },
      });
    }
  }

  const activeHabits = store.habits.filter(h => !h.isPaused);
  const habitsMissed = activeHabits.filter(h => {
    const logs = weekLogs.filter(l => l.refId === h.id);
    const missed = logs.filter(l => l.status === 'skipped').length;
    const completed = logs.filter(l => l.status === 'completed' || l.status === 'micro').length;
    return missed >= 3 && completed <= 1;
  });

  if (habitsMissed.length > 0) {
    gaps.push({
      label: `${habitsMissed[0].title} — missed ${habitsMissed.length > 1 ? 'repeatedly' : '3+ times'}`,
      whyItMatters: 'Persistent misses signal a design issue, not a discipline issue.',
      fixAction: { label: 'Add Minimum Version', actionType: 'adjust-habit', payload: { habitId: habitsMissed[0].id } },
    });
  }

  const today = new Date().toLocaleDateString('en-CA');
  const overdueTasks = store.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  if (overdueTasks.length >= 3) {
    gaps.push({
      label: `${overdueTasks.length} overdue tasks building up`,
      whyItMatters: 'An overflowing backlog drains energy and undermines confidence.',
      fixAction: { label: 'Quick cleanup sprint', actionType: 'create-task', payload: { title: '15-min overdue cleanup', energy: 'Low' } },
    });
  }

  return {
    evidence: evidence.slice(0, 6),
    gaps: gaps.slice(0, 5),
  };
}
