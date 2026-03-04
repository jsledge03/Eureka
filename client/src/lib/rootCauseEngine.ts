import type { SeasonMode } from '@/lib/seasonEngine';
import type { DriftAlert } from '@/lib/driftEngine';
import type { BurnoutResult } from '@/lib/burnoutEngine';
import type { CognitiveLoadResult } from '@/lib/cognitiveLoadEngine';
import type { FrictionInsights } from '@/lib/frictionEngine';
import type { TrajectoryResult } from '@/lib/trajectoryEngine';
import type { WeeklyForecast } from '@/lib/forecastEngine';
import type { CommitmentBudget, CommitmentUsage } from '@/lib/commitmentEngine';
import type { Identity, Goal, Habit, Task, CompletionLog, DailyRhythm } from '@/store/useStore';

export type RootCauseType =
  | 'capacity-overload'
  | 'friction-misalignment'
  | 'overcommitment'
  | 'energy-mismatch'
  | 'domain-neglect'
  | 'recovery-deficit'
  | 'identity-behavior-tension';

export type RootCauseSeverity = 'low' | 'moderate' | 'high';

export interface RootCause {
  cause: RootCauseType;
  confidence: number;
  evidence: string;
  severity: RootCauseSeverity;
}

export interface RootCauseInput {
  driftAlerts: DriftAlert[];
  burnout: BurnoutResult;
  cognitiveLoad: CognitiveLoadResult;
  frictionInsights: FrictionInsights;
  trajectory: TrajectoryResult;
  forecast: WeeklyForecast;
  commitmentBudget: CommitmentBudget;
  commitmentUsage: CommitmentUsage;
  identities: Identity[];
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  logs: CompletionLog[];
  dailyRhythms: Record<string, DailyRhythm>;
  seasonMode: SeasonMode;
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

function toSeverity(score: number): RootCauseSeverity {
  if (score >= 7) return 'high';
  if (score >= 4) return 'moderate';
  return 'low';
}

export function classifyRootCauses(input: RootCauseInput): RootCause[] {
  const causes: RootCause[] = [];

  detectCapacityOverload(input, causes);
  detectFrictionMisalignment(input, causes);
  detectOvercommitment(input, causes);
  detectEnergyMismatch(input, causes);
  detectDomainNeglect(input, causes);
  detectRecoveryDeficit(input, causes);
  detectIdentityBehaviorTension(input, causes);

  causes.sort((a, b) => b.confidence - a.confidence);

  return causes;
}

function detectCapacityOverload(input: RootCauseInput, causes: RootCause[]): void {
  let score = 0;
  const evidenceParts: string[] = [];

  if (input.commitmentUsage.totalUsed > input.commitmentBudget.totalBudget) {
    const overBy = input.commitmentUsage.totalUsed - input.commitmentBudget.totalBudget;
    score += overBy > 20 ? 4 : 2;
    evidenceParts.push(`Commitment usage (${input.commitmentUsage.totalUsed}) exceeds budget (${input.commitmentBudget.totalBudget})`);
  }

  if (input.cognitiveLoad.level === 'High') {
    score += 3;
    evidenceParts.push('Cognitive load is High');
  } else if (input.cognitiveLoad.level === 'Moderate') {
    score += 1;
  }

  const today = new Date().toLocaleDateString('en-CA');
  const overdueTasks = input.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  if (overdueTasks.length >= 5) {
    score += 2;
    evidenceParts.push(`${overdueTasks.length} overdue tasks`);
  }

  if (score >= 3) {
    causes.push({
      cause: 'capacity-overload',
      confidence: Math.min(1, score / 10),
      evidence: evidenceParts.length > 0 ? evidenceParts.join('. ') : 'Multiple capacity signals are elevated',
      severity: toSeverity(score),
    });
  }
}

function detectFrictionMisalignment(input: RootCauseInput, causes: RootCause[]): void {
  let score = 0;
  const evidenceParts: string[] = [];

  const topEntities = input.frictionInsights.topEntities;
  const highFrictionItems = topEntities.filter(e => e.count >= 3);
  if (highFrictionItems.length >= 2) {
    score += 4;
    evidenceParts.push(`${highFrictionItems.length} items with 3+ friction events`);
  } else if (highFrictionItems.length === 1) {
    score += 2;
    evidenceParts.push(`"${highFrictionItems[0].entityTitle}" has ${highFrictionItems[0].count} friction events`);
  }

  if (input.frictionInsights.suggestions.length >= 3) {
    score += 2;
    evidenceParts.push(`${input.frictionInsights.suggestions.length} friction-driven redesign suggestions`);
  }

  const headwindFriction = input.trajectory.headwinds.some(h => h.toLowerCase().includes('friction'));
  if (headwindFriction) {
    score += 1;
    evidenceParts.push('Friction flagged as a trajectory headwind');
  }

  if (score >= 3) {
    causes.push({
      cause: 'friction-misalignment',
      confidence: Math.min(1, score / 8),
      evidence: evidenceParts.join('. '),
      severity: toSeverity(score),
    });
  }
}

function detectOvercommitment(input: RootCauseInput, causes: RootCause[]): void {
  let score = 0;
  const evidenceParts: string[] = [];

  const activeGoals = input.goals.filter(g => !g.isPaused);
  const activeHabits = input.habits.filter(h => !h.isPaused);

  if (activeGoals.length > 4) {
    score += 3;
    evidenceParts.push(`${activeGoals.length} active goals competing for attention`);
  } else if (activeGoals.length > 2) {
    score += 1;
  }

  if (activeHabits.length > 10) {
    score += 3;
    evidenceParts.push(`${activeHabits.length} active habits — difficult to sustain`);
  } else if (activeHabits.length > 7) {
    score += 1;
  }

  if (input.forecast.outlook === 'Risk of overload' || input.forecast.outlook === 'Recovery needed') {
    score += 2;
    evidenceParts.push(`Forecast outlook: ${input.forecast.outlook}`);
  }

  if (score >= 3) {
    causes.push({
      cause: 'overcommitment',
      confidence: Math.min(1, score / 9),
      evidence: evidenceParts.length > 0 ? evidenceParts.join('. ') : 'Too many active commitments relative to capacity',
      severity: toSeverity(score),
    });
  }
}

function detectEnergyMismatch(input: RootCauseInput, causes: RootCause[]): void {
  let score = 0;
  const evidenceParts: string[] = [];

  const last7 = getLast7Dates();
  const rhythmDays = last7.filter(d => input.dailyRhythms[d]).map(d => input.dailyRhythms[d]);

  if (rhythmDays.length >= 3) {
    const avgEnergy = rhythmDays.reduce((s, r) => s + r.energy, 0) / rhythmDays.length;

    if (avgEnergy <= 2) {
      score += 4;
      evidenceParts.push(`Very low average energy (${avgEnergy.toFixed(1)}/5)`);
    } else if (avgEnergy <= 2.5) {
      score += 2;
      evidenceParts.push(`Low average energy (${avgEnergy.toFixed(1)}/5)`);
    }

    const pushDaysLowEnergy = rhythmDays.filter(r => r.capacity === 'Push' && r.energy <= 2).length;
    if (pushDaysLowEnergy >= 2) {
      score += 2;
      evidenceParts.push(`${pushDaysLowEnergy} days pushing through low energy`);
    }
  }

  if (input.commitmentBudget.energyModifier < -5) {
    score += 1;
    evidenceParts.push('Energy is dragging down commitment budget');
  }

  if (score >= 3) {
    causes.push({
      cause: 'energy-mismatch',
      confidence: Math.min(1, score / 8),
      evidence: evidenceParts.join('. '),
      severity: toSeverity(score),
    });
  }
}

function detectDomainNeglect(input: RootCauseInput, causes: RootCause[]): void {
  let score = 0;
  const evidenceParts: string[] = [];

  const domainDriftAlerts = input.driftAlerts.filter(a => a.type === 'domain');
  if (domainDriftAlerts.length >= 2) {
    score += 4;
    evidenceParts.push(`${domainDriftAlerts.length} domains drifting`);
  } else if (domainDriftAlerts.length === 1) {
    score += 2;
    evidenceParts.push(`"${domainDriftAlerts[0].title}" domain is drifting`);
  }

  const activeIdentities = input.identities.filter(i => i.isActive);
  const emphasizedDomains = new Set<string>();
  activeIdentities.forEach(id => {
    if (id.domainEmphasis) {
      Object.entries(id.domainEmphasis).forEach(([d, w]) => {
        if (w >= 2) emphasizedDomains.add(d);
      });
    }
  });

  if (emphasizedDomains.size > 0) {
    const last7 = getLast7Dates();
    const last7Set = new Set(last7);
    const recentLogs = input.logs.filter(l => last7Set.has(l.date) && (l.status === 'completed' || l.status === 'micro'));

    let neglectedCount = 0;
    for (const domain of Array.from(emphasizedDomains)) {
      const domainItems = [
        ...input.habits.filter(h => h.domain === domain && !h.isPaused).map(h => h.id),
        ...input.tasks.filter(t => t.domain === domain).map(t => t.id),
      ];
      const completions = recentLogs.filter(l => domainItems.includes(l.refId)).length;
      if (completions === 0 && domainItems.length > 0) neglectedCount++;
    }

    if (neglectedCount >= 2) {
      score += 2;
      evidenceParts.push(`${neglectedCount} emphasized domains with zero activity this week`);
    }
  }

  if (score >= 3) {
    causes.push({
      cause: 'domain-neglect',
      confidence: Math.min(1, score / 7),
      evidence: evidenceParts.join('. '),
      severity: toSeverity(score),
    });
  }
}

function detectRecoveryDeficit(input: RootCauseInput, causes: RootCause[]): void {
  let score = 0;
  const evidenceParts: string[] = [];

  if (input.burnout.risk === 'High') {
    score += 4;
    evidenceParts.push('Burnout risk is High');
  } else if (input.burnout.risk === 'Watch') {
    score += 2;
    evidenceParts.push('Burnout risk at Watch level');
  }

  const last7 = getLast7Dates();
  const rhythmDays = last7.filter(d => input.dailyRhythms[d]).map(d => input.dailyRhythms[d]);
  if (rhythmDays.length >= 3) {
    const recoverDays = rhythmDays.filter(r => r.capacity === 'Recover').length;
    const pushDays = rhythmDays.filter(r => r.capacity === 'Push').length;

    if (pushDays >= 5 && recoverDays === 0) {
      score += 3;
      evidenceParts.push(`${pushDays} push days with zero recovery`);
    } else if (pushDays >= 4 && recoverDays === 0) {
      score += 2;
      evidenceParts.push('Sustained pushing without recovery days');
    }
  }

  if (input.seasonMode === 'Sprint' || input.seasonMode === 'Leadership Peak' || input.seasonMode === 'Focus Sprint') {
    score += 1;
    evidenceParts.push(`${input.seasonMode} season compounds recovery deficit`);
  }

  if (score >= 3) {
    causes.push({
      cause: 'recovery-deficit',
      confidence: Math.min(1, score / 8),
      evidence: evidenceParts.join('. '),
      severity: toSeverity(score),
    });
  }
}

function detectIdentityBehaviorTension(input: RootCauseInput, causes: RootCause[]): void {
  let score = 0;
  const evidenceParts: string[] = [];

  const identityDrift = input.driftAlerts.filter(a => a.type === 'identity-goal');
  if (identityDrift.length >= 2) {
    score += 4;
    evidenceParts.push(`${identityDrift.length} identity-goal drift alerts`);
  } else if (identityDrift.length === 1) {
    score += 2;
    evidenceParts.push(identityDrift[0].title);
  }

  const activeIdentities = input.identities.filter(i => i.isActive);
  const activeGoals = input.goals.filter(g => !g.isPaused);
  const disconnectedIdentities = activeIdentities.filter(id =>
    !activeGoals.some(g => g.identityId === id.id)
  );
  if (disconnectedIdentities.length > 0 && activeIdentities.length > 0) {
    score += 2;
    evidenceParts.push(`${disconnectedIdentities.length} active identit${disconnectedIdentities.length > 1 ? 'ies' : 'y'} without linked goals`);
  }

  const headwindIdentity = input.trajectory.headwinds.some(h => h.toLowerCase().includes('drift') || h.toLowerCase().includes('identity'));
  if (headwindIdentity) {
    score += 1;
    evidenceParts.push('Identity-behavior tension appears in trajectory headwinds');
  }

  if (score >= 3) {
    causes.push({
      cause: 'identity-behavior-tension',
      confidence: Math.min(1, score / 8),
      evidence: evidenceParts.join('. '),
      severity: toSeverity(score),
    });
  }
}
