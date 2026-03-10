import type { Identity, Goal, Habit, Task, CompletionLog, DailyRhythm, FrictionEvent, ProofEvent, WeeklyCheckIn, Domain, DOMAINS } from '@/store/useStore';
import type { SeasonMode } from '@/lib/seasonEngine';
import type { DriftAlert } from '@/lib/driftEngine';

export interface NarrativeProtected {
  domain: string;
  evidence: string;
}

export interface NarrativeDrifted {
  signal: string;
  cause: string;
}

export type NarrativeActionType = 'navigate-habits' | 'navigate-coach' | 'navigate-review' | 'navigate-tasks' | 'apply-pause' | 'apply-simplify' | 'apply-season';

export interface NarrativeRecommendation {
  id: string;
  label: string;
  description: string;
  actionType: NarrativeActionType;
}

export interface DomainBalanceEntry {
  domain: string;
  completions: number;
  percentage: number;
  status: 'strong' | 'moderate' | 'weak' | 'inactive';
}

export interface OperationalRisk {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  actionType: NarrativeActionType;
}

export interface StrategicLeverageItem {
  id: string;
  title: string;
  description: string;
  actionType: NarrativeActionType;
}

export interface WeeklyNarrative {
  protected: NarrativeProtected[];
  drifted: NarrativeDrifted[];
  patterns: string[];
  recommendations: NarrativeRecommendation[];
  executiveSummary: string;
  domainBalance: DomainBalanceEntry[];
  operationalRisks: OperationalRisk[];
  strategicLeverage: StrategicLeverageItem[];
  nextWeekFocus: string[];
}

interface NarrativeInput {
  identities: Identity[];
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  logs: CompletionLog[];
  dailyRhythms: Record<string, DailyRhythm>;
  frictionEvents: FrictionEvent[];
  proofEvents: ProofEvent[];
  driftAlerts: DriftAlert[];
  weeklyCheckIns: WeeklyCheckIn[];
  seasonMode: SeasonMode;
  strategicIntent?: string;
  allDomains?: string[];
}

function getLast7Dates(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA'));
  }
  return dates;
}

export function generateWeeklyNarrative(input: NarrativeInput): WeeklyNarrative {
  const { identities, goals, habits, tasks, logs, dailyRhythms, frictionEvents, proofEvents, driftAlerts, weeklyCheckIns, seasonMode, strategicIntent } = input;

  const last7 = getLast7Dates();
  const last7Set = new Set(last7);
  const recentLogs = logs.filter(l => last7Set.has(l.date));
  const completedLogs = recentLogs.filter(l => l.status === 'completed' || l.status === 'micro');

  const protectedItems = computeProtected(completedLogs, habits, tasks, proofEvents, last7Set);
  const driftedItems = computeDrifted(driftAlerts, frictionEvents, dailyRhythms, last7);
  const patterns = computePatterns(frictionEvents, dailyRhythms, completedLogs, last7, last7Set);
  const recommendations = computeRecommendations(protectedItems, driftedItems, patterns, habits, goals, tasks, seasonMode);
  const executiveSummary = computeExecutiveSummary(completedLogs, recentLogs, driftAlerts, frictionEvents, dailyRhythms, last7, habits, tasks, goals, seasonMode, strategicIntent);
  const domainBalance = computeDomainBalance(completedLogs, habits, tasks, goals, input.allDomains);
  const operationalRisks = computeOperationalRisks(driftAlerts, frictionEvents, tasks, habits, dailyRhythms, last7, last7Set);
  const strategicLeverage = computeStrategicLeverage(protectedItems, habits, goals, completedLogs, last7Set);
  const nextWeekFocus = computeNextWeekFocus(driftedItems, operationalRisks, protectedItems, patterns, goals, seasonMode);

  return {
    protected: protectedItems,
    drifted: driftedItems,
    patterns,
    recommendations,
    executiveSummary,
    domainBalance,
    operationalRisks,
    strategicLeverage,
    nextWeekFocus,
  };
}

function computeExecutiveSummary(
  completedLogs: CompletionLog[],
  recentLogs: CompletionLog[],
  driftAlerts: DriftAlert[],
  frictionEvents: FrictionEvent[],
  dailyRhythms: Record<string, DailyRhythm>,
  last7: string[],
  habits: Habit[],
  tasks: Task[],
  goals: Goal[],
  seasonMode: SeasonMode,
  strategicIntent?: string,
): string {
  const totalCompletions = completedLogs.length;
  const totalLogs = recentLogs.length;
  const completionRate = totalLogs > 0 ? Math.round((totalCompletions / totalLogs) * 100) : 0;

  const rhythmDays = last7.filter(d => dailyRhythms[d]).map(d => dailyRhythms[d]);
  const avgEnergy = rhythmDays.length > 0
    ? rhythmDays.reduce((s, r) => s + r.energy, 0) / rhythmDays.length
    : 0;

  const cutoff7 = last7[last7.length - 1];
  const recentFriction = frictionEvents.filter(e => e.dateKey >= cutoff7);
  const activeGoals = goals.filter(g => !g.isPaused);
  const activeHabits = habits.filter(h => !h.isPaused);

  if (totalLogs === 0 && activeGoals.length === 0 && activeHabits.length === 0) {
    return 'No activity recorded this week. Set up your goals and habits to start tracking.';
  }

  if (totalLogs === 0) {
    return `${activeGoals.length} goal${activeGoals.length !== 1 ? 's' : ''} and ${activeHabits.length} habit${activeHabits.length !== 1 ? 's' : ''} active but no completions logged this week. Start logging to build momentum.`;
  }

  let status: string;
  if (completionRate >= 80 && driftAlerts.length === 0) {
    status = 'System operating at high efficiency';
  } else if (completionRate >= 60) {
    status = 'System performing steadily';
  } else if (completionRate >= 40) {
    status = 'System under moderate strain';
  } else {
    status = 'System capacity constrained';
  }

  const parts: string[] = [status];
  parts.push(`${completionRate}% completion rate across ${totalCompletions} items`);

  if (avgEnergy > 0) {
    parts.push(`avg energy ${avgEnergy.toFixed(1)}/5`);
  }

  if (driftAlerts.length > 0) {
    parts.push(`${driftAlerts.length} drift signal${driftAlerts.length !== 1 ? 's' : ''} detected`);
  }

  if (recentFriction.length > 0) {
    parts.push(`${recentFriction.length} friction event${recentFriction.length !== 1 ? 's' : ''}`);
  }

  let summary = `${parts[0]}. ${parts.slice(1).join(' · ')}. Season: ${seasonMode}.`;
  if (strategicIntent) {
    const intentSnippet = strategicIntent.length > 60 ? strategicIntent.slice(0, 60) + '…' : strategicIntent;
    summary += ` Intent: "${intentSnippet}"`;
  }
  return summary;
}

function computeDomainBalance(
  completedLogs: CompletionLog[],
  habits: Habit[],
  tasks: Task[],
  goals: Goal[],
  domainList?: string[],
): DomainBalanceEntry[] {
  const ALL_DOMAINS: string[] = domainList ?? ['Physical', 'Emotional', 'Mental', 'Social', 'Spiritual', 'Career', 'Financial'];

  const domainCompletions: Record<string, number> = {};
  const activeDomains = new Set<string>();

  for (const g of goals.filter(g => !g.isPaused)) {
    if (g.domain) activeDomains.add(g.domain);
  }
  for (const h of habits.filter(h => !h.isPaused)) {
    if (h.domain) activeDomains.add(h.domain);
  }

  for (const log of completedLogs) {
    const habit = habits.find(h => h.id === log.refId);
    const task = tasks.find(t => t.id === log.refId);
    const domain = habit?.domain || task?.domain;
    if (!domain) continue;
    domainCompletions[domain] = (domainCompletions[domain] ?? 0) + 1;
  }

  const totalCompletions = Object.values(domainCompletions).reduce((s, v) => s + v, 0);

  return ALL_DOMAINS.map(domain => {
    const completions = domainCompletions[domain] ?? 0;
    const percentage = totalCompletions > 0 ? Math.round((completions / totalCompletions) * 100) : 0;
    let status: DomainBalanceEntry['status'];

    if (!activeDomains.has(domain) && completions === 0) {
      status = 'inactive';
    } else if (percentage >= 25) {
      status = 'strong';
    } else if (percentage >= 10) {
      status = 'moderate';
    } else {
      status = 'weak';
    }

    return { domain, completions, percentage, status };
  }).filter(d => d.status !== 'inactive' || d.completions > 0);
}

function computeOperationalRisks(
  driftAlerts: DriftAlert[],
  frictionEvents: FrictionEvent[],
  tasks: Task[],
  habits: Habit[],
  dailyRhythms: Record<string, DailyRhythm>,
  last7: string[],
  last7Set: Set<string>,
): OperationalRisk[] {
  const risks: OperationalRisk[] = [];
  const today = new Date().toLocaleDateString('en-CA');
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  const cutoff7 = last7[last7.length - 1];
  const recentFriction = frictionEvents.filter(e => e.dateKey >= cutoff7);
  const rhythmDays = last7.filter(d => dailyRhythms[d]).map(d => dailyRhythms[d]);
  const avgEnergy = rhythmDays.length > 0
    ? rhythmDays.reduce((s, r) => s + r.energy, 0) / rhythmDays.length
    : 0;

  if (overdueTasks.length >= 5) {
    risks.push({
      id: 'overdue-backlog',
      title: 'Task backlog growing',
      severity: 'high',
      description: `${overdueTasks.length} overdue tasks accumulating. Triage or batch-defer to regain control.`,
      actionType: 'navigate-tasks',
    });
  } else if (overdueTasks.length >= 3) {
    risks.push({
      id: 'overdue-moderate',
      title: 'Overdue tasks piling up',
      severity: 'medium',
      description: `${overdueTasks.length} tasks past due. Address before they compound.`,
      actionType: 'navigate-tasks',
    });
  }

  if (avgEnergy > 0 && avgEnergy <= 2) {
    risks.push({
      id: 'energy-depletion',
      title: 'Energy critically low',
      severity: 'high',
      description: `Average energy ${avgEnergy.toFixed(1)}/5 this week. Consider switching to recovery mode.`,
      actionType: 'apply-season',
    });
  } else if (avgEnergy > 0 && avgEnergy <= 3) {
    risks.push({
      id: 'energy-moderate',
      title: 'Energy below optimal',
      severity: 'medium',
      description: `Average energy ${avgEnergy.toFixed(1)}/5. Protect high-energy windows for critical work.`,
      actionType: 'navigate-review',
    });
  }

  if (recentFriction.length >= 5) {
    risks.push({
      id: 'friction-overload',
      title: 'High friction environment',
      severity: 'high',
      description: `${recentFriction.length} friction events this week. System redesign needed to reduce resistance.`,
      actionType: 'navigate-habits',
    });
  } else if (recentFriction.length >= 3) {
    risks.push({
      id: 'friction-rising',
      title: 'Friction accumulating',
      severity: 'medium',
      description: `${recentFriction.length} friction events. Monitor and address root causes.`,
      actionType: 'navigate-habits',
    });
  }

  const activeHabitsNoFallback = habits.filter(h => !h.isPaused && !h.fallback && h.schedule === 'Daily');
  if (activeHabitsNoFallback.length >= 4) {
    risks.push({
      id: 'no-fallback',
      title: 'Missing safety nets',
      severity: 'low',
      description: `${activeHabitsNoFallback.length} daily habits lack a minimum version. Add fallbacks to protect streaks.`,
      actionType: 'navigate-habits',
    });
  }

  if (driftAlerts.length >= 3) {
    risks.push({
      id: 'multi-drift',
      title: 'Multiple drift signals',
      severity: 'high',
      description: `${driftAlerts.length} areas drifting simultaneously. Prioritize the most critical domain.`,
      actionType: 'navigate-coach',
    });
  }

  return risks.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  }).slice(0, 4);
}

function computeStrategicLeverage(
  protectedItems: NarrativeProtected[],
  habits: Habit[],
  goals: Goal[],
  completedLogs: CompletionLog[],
  last7Set: Set<string>,
): StrategicLeverageItem[] {
  const items: StrategicLeverageItem[] = [];

  if (protectedItems.length > 0) {
    items.push({
      id: 'momentum-domain',
      title: `${protectedItems[0].domain} momentum`,
      description: `Strong activity in ${protectedItems[0].domain}. Double down while momentum is high.`,
      actionType: 'navigate-review',
    });
  }

  const keystoneHabits = habits.filter(h => h.isKeystone && !h.isPaused);
  const keystoneCompletions = completedLogs.filter(l =>
    keystoneHabits.some(h => h.id === l.refId)
  ).length;
  if (keystoneHabits.length > 0 && keystoneCompletions >= keystoneHabits.length * 3) {
    items.push({
      id: 'keystone-strong',
      title: 'Keystone habits holding',
      description: `${keystoneCompletions} keystone completions this week. These anchor your entire system.`,
      actionType: 'navigate-habits',
    });
  }

  const goalsNearCompletion = goals.filter(g =>
    !g.isPaused && g.isManualProgress && g.currentProgress >= g.targetProgress * 0.8
  );
  if (goalsNearCompletion.length > 0) {
    items.push({
      id: 'goal-close',
      title: `${goalsNearCompletion[0].title} nearly complete`,
      description: `${Math.round((goalsNearCompletion[0].currentProgress / goalsNearCompletion[0].targetProgress) * 100)}% done. A focused push could close this out.`,
      actionType: 'navigate-tasks',
    });
  }

  const habitsWithFallback = habits.filter(h => !h.isPaused && h.fallback && !h.isMicro);
  if (habitsWithFallback.length >= 3) {
    items.push({
      id: 'resilience-built',
      title: 'Resilience infrastructure',
      description: `${habitsWithFallback.length} habits have fallback versions ready. Your system adapts under pressure.`,
      actionType: 'navigate-habits',
    });
  }

  return items.slice(0, 3);
}

function computeNextWeekFocus(
  driftedItems: NarrativeDrifted[],
  operationalRisks: OperationalRisk[],
  protectedItems: NarrativeProtected[],
  patterns: string[],
  goals: Goal[],
  seasonMode: SeasonMode,
): string[] {
  const focus: string[] = [];

  if (driftedItems.length > 0) {
    focus.push(`Address drift in "${driftedItems[0].signal}" before it compounds`);
  }

  const highRisks = operationalRisks.filter(r => r.severity === 'high');
  if (highRisks.length > 0 && focus.length < 3) {
    focus.push(`Resolve: ${highRisks[0].title}`);
  }

  if (protectedItems.length > 0 && focus.length < 3) {
    focus.push(`Continue protecting ${protectedItems[0].domain} momentum`);
  }

  const activeGoals = goals.filter(g => !g.isPaused);
  const nearComplete = activeGoals.find(g => g.isManualProgress && g.currentProgress >= g.targetProgress * 0.8);
  if (nearComplete && focus.length < 3) {
    focus.push(`Push to finish "${nearComplete.title}"`);
  }

  if (patterns.some(p => p.toLowerCase().includes('recovery') || p.toLowerCase().includes('low energy')) && focus.length < 3) {
    focus.push('Prioritize recovery — schedule lighter days');
  }

  if (focus.length === 0) {
    if (activeGoals.length > 0) {
      focus.push(`Focus on "${activeGoals[0].title}" — your top active goal`);
    }
    focus.push(`Maintain ${seasonMode} season rhythm`);
  }

  return focus.slice(0, 3);
}

function computeProtected(
  completedLogs: CompletionLog[],
  habits: Habit[],
  tasks: Task[],
  proofEvents: ProofEvent[],
  last7Set: Set<string>
): NarrativeProtected[] {
  const domainCompletions: Record<string, { count: number; items: string[] }> = {};

  for (const log of completedLogs) {
    const habit = habits.find(h => h.id === log.refId);
    const task = tasks.find(t => t.id === log.refId);
    const domain = habit?.domain || task?.domain;
    if (!domain) continue;

    if (!domainCompletions[domain]) {
      domainCompletions[domain] = { count: 0, items: [] };
    }
    domainCompletions[domain].count++;
    const title = habit?.title || task?.title;
    if (title && !domainCompletions[domain].items.includes(title)) {
      domainCompletions[domain].items.push(title);
    }
  }

  const sorted = Object.entries(domainCompletions)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 2);

  return sorted.map(([domain, data]) => {
    const topItems = data.items.slice(0, 3).join(', ');
    const recentProof = proofEvents
      .filter(p => p.domain === domain && p.dateKey && last7Set.has(p.dateKey))
      .slice(0, 1);

    let evidence = `${data.count} completions this week`;
    if (topItems) evidence += ` — ${topItems}`;
    if (recentProof.length > 0) evidence += `. ${recentProof[0].title}`;

    return { domain, evidence };
  });
}

function computeDrifted(
  driftAlerts: DriftAlert[],
  frictionEvents: FrictionEvent[],
  dailyRhythms: Record<string, DailyRhythm>,
  last7: string[]
): NarrativeDrifted[] {
  if (driftAlerts.length === 0) return [];

  const rhythmDays = last7.filter(d => dailyRhythms[d]).map(d => dailyRhythms[d]);
  const avgEnergy = rhythmDays.length > 0
    ? rhythmDays.reduce((s, r) => s + r.energy, 0) / rhythmDays.length
    : 3;

  const cutoff7 = last7[last7.length - 1];
  const recentFriction = frictionEvents.filter(e => e.dateKey >= cutoff7);

  const topReasons = new Map<string, number>();
  for (const e of recentFriction) {
    topReasons.set(e.reasonTag, (topReasons.get(e.reasonTag) ?? 0) + 1);
  }
  const topReason = Array.from(topReasons.entries()).sort((a, b) => b[1] - a[1])[0];

  return driftAlerts.slice(0, 2).map(alert => {
    let cause = alert.likelyCause || 'Multiple competing priorities';

    if (avgEnergy <= 2.5) {
      cause = `Low energy this week (avg ${avgEnergy.toFixed(1)}/5) likely contributed`;
    } else if (topReason && topReason[1] >= 2) {
      cause = `"${topReason[0]}" friction appeared ${topReason[1]} times this week`;
    } else if (recentFriction.length >= 3) {
      cause = `${recentFriction.length} friction events this week creating resistance`;
    }

    return {
      signal: alert.title,
      cause,
    };
  });
}

function computePatterns(
  frictionEvents: FrictionEvent[],
  dailyRhythms: Record<string, DailyRhythm>,
  completedLogs: CompletionLog[],
  last7: string[],
  last7Set: Set<string>
): string[] {
  const patterns: string[] = [];

  const cutoff7 = last7[last7.length - 1];
  const recentFriction = frictionEvents.filter(e => e.dateKey >= cutoff7);

  if (recentFriction.length >= 2) {
    const timeCounts = new Map<string, number>();
    for (const e of recentFriction) {
      if (e.context?.timeOfDay) {
        timeCounts.set(e.context.timeOfDay, (timeCounts.get(e.context.timeOfDay) ?? 0) + 1);
      }
    }
    const topTime = Array.from(timeCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topTime && topTime[1] >= 2) {
      patterns.push(`Friction clusters in the ${topTime[0].toLowerCase()} — consider rescheduling affected items`);
    }

    const dayCounts = new Map<string, number>();
    for (const e of recentFriction) {
      if (e.context?.dayOfWeek) {
        dayCounts.set(e.context.dayOfWeek, (dayCounts.get(e.context.dayOfWeek) ?? 0) + 1);
      }
    }
    const topDay = Array.from(dayCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topDay && topDay[1] >= 2) {
      patterns.push(`${topDay[0]}s show the most friction — consider lighter expectations that day`);
    }
  }

  const rhythmDays = last7.filter(d => dailyRhythms[d]).map(d => dailyRhythms[d]);
  if (rhythmDays.length >= 3) {
    const highEnergyDays = rhythmDays.filter(r => r.energy >= 4);
    const lowEnergyDays = rhythmDays.filter(r => r.energy <= 2);

    if (highEnergyDays.length >= 3) {
      patterns.push('Strong energy most of the week — good window for challenging work');
    } else if (lowEnergyDays.length >= 3) {
      patterns.push('Low energy pattern this week — prioritize recovery and minimum versions');
    }

    const pushDays = rhythmDays.filter(r => r.capacity === 'Push').length;
    const recoverDays = rhythmDays.filter(r => r.capacity === 'Recover').length;
    if (pushDays >= 4 && recoverDays === 0) {
      patterns.push('All push, no recovery — schedule at least one lighter day');
    }
  }

  const completionsByDay = new Map<string, number>();
  for (const log of completedLogs) {
    completionsByDay.set(log.date, (completionsByDay.get(log.date) ?? 0) + 1);
  }
  const dayValues = Array.from(completionsByDay.values());
  if (dayValues.length >= 3) {
    const avg = dayValues.reduce((s, v) => s + v, 0) / dayValues.length;
    const max = Math.max(...dayValues);
    const min = Math.min(...dayValues);
    if (max > avg * 2 && min < avg * 0.3) {
      patterns.push('Completion rate swings wildly between days — consider more consistent daily targets');
    }
  }

  return patterns.slice(0, 3);
}

function computeRecommendations(
  protectedItems: NarrativeProtected[],
  driftedItems: NarrativeDrifted[],
  patterns: string[],
  habits: Habit[],
  goals: Goal[],
  tasks: Task[],
  seasonMode: SeasonMode
): NarrativeRecommendation[] {
  const recs: NarrativeRecommendation[] = [];

  if (driftedItems.length > 0) {
    recs.push({
      id: 'address-drift',
      label: 'Address drift signals',
      description: `"${driftedItems[0].signal}" needs attention. Review your Coach tab for specific actions.`,
      actionType: 'navigate-coach',
    });
  }

  const today = new Date().toLocaleDateString('en-CA');
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  if (overdueTasks.length >= 3) {
    recs.push({
      id: 'triage-overdue',
      label: 'Triage overdue tasks',
      description: `${overdueTasks.length} overdue tasks need attention. Complete, reschedule, or remove them.`,
      actionType: 'navigate-tasks',
    });
  }

  const highFrictionHabits = habits.filter(h => !h.isPaused && !h.fallback && h.schedule === 'Daily');
  if (highFrictionHabits.length > 5 && patterns.some(p => p.toLowerCase().includes('friction'))) {
    recs.push({
      id: 'simplify-habits',
      label: 'Simplify daily habits',
      description: 'You have many daily habits without fallback versions. Add minimum versions to reduce friction.',
      actionType: 'navigate-habits',
    });
  }

  const pausedGoals = goals.filter(g => g.isPaused);
  const activeGoals = goals.filter(g => !g.isPaused);
  if (activeGoals.length > 4 && protectedItems.length <= 1) {
    recs.push({
      id: 'reduce-goals',
      label: 'Consider pausing a goal',
      description: `${activeGoals.length} active goals but limited evidence of progress. Focus on fewer to protect what matters.`,
      actionType: 'apply-pause',
    });
  }

  if (seasonMode === 'Sprint' && patterns.some(p => p.toLowerCase().includes('recovery') || p.toLowerCase().includes('low energy'))) {
    recs.push({
      id: 'reconsider-season',
      label: 'Reconsider Sprint season',
      description: 'Your energy patterns suggest Sprint mode may not be sustainable right now. Consider switching to Build or Stabilize.',
      actionType: 'apply-season',
    });
  }

  if (recs.length === 0) {
    if (protectedItems.length > 0) {
      recs.push({
        id: 'maintain-momentum',
        label: 'Keep protecting what works',
        description: `Your ${protectedItems[0].domain} domain is strong this week. Maintain the rhythm.`,
        actionType: 'navigate-review',
      });
    }
    recs.push({
      id: 'weekly-review',
      label: 'Complete your weekly review',
      description: 'Use the Review tab to reflect on your week and plan adjustments.',
      actionType: 'navigate-review',
    });
  }

  return recs.slice(0, 3);
}
