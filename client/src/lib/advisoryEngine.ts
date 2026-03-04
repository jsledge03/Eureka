import type { RootCause, RootCauseType } from '@/lib/rootCauseEngine';
import type { SeasonMode } from '@/lib/seasonEngine';
import type { BurnoutResult } from '@/lib/burnoutEngine';
import type { CognitiveLoadResult } from '@/lib/cognitiveLoadEngine';
import type { WeeklyForecast } from '@/lib/forecastEngine';
import type { TrajectoryResult } from '@/lib/trajectoryEngine';
import type { CommitmentBudget, CommitmentUsage } from '@/lib/commitmentEngine';
import type { Goal, Habit } from '@/store/useStore';

export type AdvisoryMode = 'reflective' | 'executive';

export type MitigationActionType =
  | 'pause-habit'
  | 'pause-goal'
  | 'switch-season'
  | 'reduce-task-target'
  | 'minimum-version'
  | 'schedule-recovery'
  | 'focus-domain'
  | 'reduce-goals'
  | 'simplify-habits';

export interface MitigationAction {
  id: string;
  label: string;
  description: string;
  actionType: MitigationActionType;
  targetId?: string;
}

export interface MitigationTier {
  minimum: MitigationAction[];
  standard: MitigationAction[];
  structural: MitigationAction[];
}

export interface NextBestAction {
  id: string;
  label: string;
  description: string;
  actionType: MitigationActionType;
  targetId?: string;
}

export interface Advisory {
  situationAssessment: string;
  primaryConstraint: string;
  mitigations: MitigationTier;
  nextBestActions: NextBestAction[];
}

export interface AdvisoryInput {
  rootCauses: RootCause[];
  burnout: BurnoutResult;
  cognitiveLoad: CognitiveLoadResult;
  forecast: WeeklyForecast;
  trajectory: TrajectoryResult;
  commitmentBudget: CommitmentBudget;
  commitmentUsage: CommitmentUsage;
  goals: Goal[];
  habits: Habit[];
  seasonMode: SeasonMode;
  strategicIntent: string;
  mode: AdvisoryMode;
}

const CAUSE_LABELS: Record<RootCauseType, string> = {
  'capacity-overload': 'Capacity Overload',
  'friction-misalignment': 'Friction Misalignment',
  'overcommitment': 'Overcommitment',
  'energy-mismatch': 'Energy Mismatch',
  'domain-neglect': 'Domain Neglect',
  'recovery-deficit': 'Recovery Deficit',
  'identity-behavior-tension': 'Identity-Behavior Tension',
};

export function generateAdvisory(input: AdvisoryInput): Advisory {
  const {
    rootCauses,
    burnout,
    cognitiveLoad,
    forecast,
    trajectory,
    commitmentBudget,
    commitmentUsage,
    goals,
    habits,
    seasonMode,
    strategicIntent,
    mode,
  } = input;

  const situationAssessment = buildSituationAssessment(input);
  const primaryConstraint = buildPrimaryConstraint(rootCauses, mode);
  const mitigations = buildMitigations(input);
  const nextBestActions = buildNextBestActions(input);

  return {
    situationAssessment,
    primaryConstraint,
    mitigations,
    nextBestActions,
  };
}

function buildSituationAssessment(input: AdvisoryInput): string {
  const { rootCauses, burnout, forecast, trajectory, mode, strategicIntent, seasonMode } = input;

  const highSeverity = rootCauses.filter(c => c.severity === 'high');
  const moderateSeverity = rootCauses.filter(c => c.severity === 'moderate');

  let status: string;

  if (highSeverity.length >= 2 || burnout.risk === 'High') {
    status = mode === 'executive'
      ? 'System is under significant strain. Multiple critical signals require immediate intervention.'
      : 'Your system is carrying more than it can sustain right now. Several signals are asking for attention and care.';
  } else if (highSeverity.length === 1 || moderateSeverity.length >= 2 || burnout.risk === 'Watch') {
    status = mode === 'executive'
      ? 'System showing moderate stress. Targeted adjustments will prevent escalation.'
      : 'Things are manageable but some areas are starting to strain. A few adjustments will help you stay on track.';
  } else if (forecast.outlook === 'Stable' && trajectory.tailwinds.length >= 2) {
    status = mode === 'executive'
      ? 'System operating within healthy parameters. Maintain current trajectory.'
      : 'You\'re in a good rhythm. Your actions are aligning well with your priorities.';
  } else {
    status = mode === 'executive'
      ? 'System is steady with minor signals. Monitor and adjust as needed.'
      : 'Things are generally steady. Keep doing what\'s working and watch for small signs of drift.';
  }

  if (strategicIntent) {
    const intentRef = mode === 'executive'
      ? ` Strategic focus: "${strategicIntent.length > 60 ? strategicIntent.slice(0, 60) + '…' : strategicIntent}".`
      : ` This assessment is grounded in your intent: "${strategicIntent.length > 60 ? strategicIntent.slice(0, 60) + '…' : strategicIntent}".`;
    status += intentRef;
  }

  return status;
}

function buildPrimaryConstraint(rootCauses: RootCause[], mode: AdvisoryMode): string {
  if (rootCauses.length === 0) {
    return mode === 'executive'
      ? 'No primary constraint detected. System is operating within tolerance.'
      : 'No major constraints right now. Your system has room to operate freely.';
  }

  const primary = rootCauses[0];
  const label = CAUSE_LABELS[primary.cause];

  if (mode === 'executive') {
    return `Primary constraint: ${label} (confidence ${Math.round(primary.confidence * 100)}%). ${primary.evidence}`;
  }

  return `The main thing holding your system back is ${label.toLowerCase()}. ${primary.evidence}`;
}

function buildMitigations(input: AdvisoryInput): MitigationTier {
  const { rootCauses, goals, habits, seasonMode, commitmentUsage, commitmentBudget, mode } = input;

  const minimum: MitigationAction[] = [];
  const standard: MitigationAction[] = [];
  const structural: MitigationAction[] = [];

  const primaryCause = rootCauses[0]?.cause;
  const activeGoals = goals.filter(g => !g.isPaused);
  const activeHabits = habits.filter(h => !h.isPaused);
  const nonKeystoneHabits = activeHabits.filter(h => !h.isKeystone);
  const nonKeystoneDailyHabits = nonKeystoneHabits.filter(h => h.schedule === 'Daily');

  if (primaryCause === 'capacity-overload' || primaryCause === 'overcommitment') {
    if (nonKeystoneDailyHabits.length > 0) {
      minimum.push({
        id: 'min-version-habits',
        label: 'Switch non-keystone habits to Minimum Version',
        description: mode === 'executive'
          ? 'Reduce execution cost on non-critical habits while preserving streaks.'
          : 'Use the lighter version of your non-keystone habits to free up energy without breaking your streaks.',
        actionType: 'minimum-version',
      });
    }

    minimum.push({
      id: 'reduce-task-target',
      label: 'Lower daily task target by 2',
      description: mode === 'executive'
        ? 'Reduce daily task target to create operational margin.'
        : 'Give yourself a lighter daily goal so you can focus on what matters most.',
      actionType: 'reduce-task-target',
    });

    if (activeGoals.length > 2) {
      const pauseCandidate = activeGoals.find(g => {
        const linked = activeHabits.filter(h => h.goalId === g.id);
        return linked.length === 0;
      }) || activeGoals[activeGoals.length - 1];

      standard.push({
        id: 'pause-goal',
        label: `Pause "${pauseCandidate.title}"`,
        description: mode === 'executive'
          ? `Pausing this goal recovers ~12 commitment units. No linked habits affected.`
          : `Put "${pauseCandidate.title}" on hold to free up space for your top priorities.`,
        actionType: 'pause-goal',
        targetId: pauseCandidate.id,
      });
    }

    if (nonKeystoneDailyHabits.length > 2) {
      const target = nonKeystoneDailyHabits[nonKeystoneDailyHabits.length - 1];
      standard.push({
        id: 'pause-habit',
        label: `Pause "${target.title}"`,
        description: mode === 'executive'
          ? `Pausing frees 8 commitment units from daily load.`
          : `Take a break from "${target.title}" while your system stabilizes.`,
        actionType: 'pause-habit',
        targetId: target.id,
      });
    }

    if (activeGoals.length > 3) {
      structural.push({
        id: 'reduce-goals',
        label: 'Reduce to 2-3 active goals',
        description: mode === 'executive'
          ? 'Goal count exceeds sustainable threshold. Reduce to 2-3 for focused execution.'
          : 'Fewer goals means deeper focus. Consider keeping only the 2-3 that matter most right now.',
        actionType: 'reduce-goals',
      });
    }
  }

  if (primaryCause === 'energy-mismatch' || primaryCause === 'recovery-deficit') {
    if (seasonMode !== 'Recover' && seasonMode !== 'Stabilize') {
      minimum.push({
        id: 'switch-season-stabilize',
        label: seasonMode === 'Sprint' ? 'Exit Sprint mode' : 'Switch to Stabilize',
        description: mode === 'executive'
          ? 'Current season intensity exceeds energy capacity. Downshift recommended.'
          : 'Your energy levels suggest a gentler season would serve you better right now.',
        actionType: 'switch-season',
      });
    }

    minimum.push({
      id: 'schedule-recovery',
      label: 'Schedule a recovery day',
      description: mode === 'executive'
        ? 'Insert at least one recovery day this week to arrest energy decline.'
        : 'Give yourself permission for a lighter day to recharge.',
      actionType: 'schedule-recovery',
    });

    if (nonKeystoneHabits.length > 3) {
      standard.push({
        id: 'simplify-habits',
        label: 'Simplify to keystone habits only',
        description: mode === 'executive'
          ? 'Temporarily suspend non-keystone habits to reduce daily decision load.'
          : 'Focus only on your keystone habits until your energy recovers.',
        actionType: 'simplify-habits',
      });
    }

    structural.push({
      id: 'switch-recover',
      label: 'Switch to Recover season',
      description: mode === 'executive'
        ? 'Full season transition to recovery parameters. Reduces all thresholds.'
        : 'Move into Recover season to give your whole system permission to rest and rebuild.',
      actionType: 'switch-season',
    });
  }

  if (primaryCause === 'friction-misalignment') {
    minimum.push({
      id: 'min-version-friction',
      label: 'Apply Minimum Versions to high-friction items',
      description: mode === 'executive'
        ? 'Reduce friction on items generating repeated resistance events.'
        : 'Make your high-friction habits easier so they stop draining your energy.',
      actionType: 'minimum-version',
    });

    standard.push({
      id: 'simplify-friction-habits',
      label: 'Redesign routines around friction patterns',
      description: mode === 'executive'
        ? 'Audit and restructure items with 3+ friction events in the past 14 days.'
        : 'Rethink when, where, and how you do the things that keep creating friction.',
      actionType: 'simplify-habits',
    });
  }

  if (primaryCause === 'domain-neglect') {
    minimum.push({
      id: 'focus-domain',
      label: 'Focus on neglected domain',
      description: mode === 'executive'
        ? 'Allocate a 15-minute focus sprint to the most neglected priority domain.'
        : 'Spend 15 focused minutes on the domain you\'ve been neglecting to rebuild momentum.',
      actionType: 'focus-domain',
    });
  }

  if (primaryCause === 'identity-behavior-tension') {
    minimum.push({
      id: 'focus-identity-domain',
      label: 'Complete one identity-linked action today',
      description: mode === 'executive'
        ? 'Execute one action directly linked to an active identity goal to reduce drift.'
        : 'Do one small thing today that connects to who you\'re becoming.',
      actionType: 'focus-domain',
    });

    if (activeGoals.length > 3) {
      standard.push({
        id: 'align-goals-identity',
        label: 'Align goals with active identities',
        description: mode === 'executive'
          ? 'Review goal-identity links. Pause goals not supporting active identity statements.'
          : 'Make sure your goals actually connect to the identities you care about most.',
        actionType: 'reduce-goals',
      });
    }
  }

  if (minimum.length === 0 && rootCauses.length === 0) {
    minimum.push({
      id: 'maintain',
      label: 'Maintain current approach',
      description: mode === 'executive'
        ? 'No intervention required. Continue current operating parameters.'
        : 'Keep doing what you\'re doing — your system is working well.',
      actionType: 'focus-domain',
    });
  }

  return { minimum: minimum.slice(0, 3), standard: standard.slice(0, 3), structural: structural.slice(0, 2) };
}

function buildNextBestActions(input: AdvisoryInput): NextBestAction[] {
  const { rootCauses, trajectory, forecast, burnout, goals, habits, seasonMode, mode } = input;
  const actions: NextBestAction[] = [];

  const primaryCause = rootCauses[0]?.cause;

  if (burnout.risk === 'High' && seasonMode !== 'Recover') {
    actions.push({
      id: 'nba-switch-recover',
      label: mode === 'executive' ? 'Switch to Recover' : 'Switch to Recover season',
      description: mode === 'executive'
        ? 'Burnout risk is critical. Immediate season downshift required.'
        : 'Your burnout risk is high. Switching to Recover will protect your wellbeing.',
      actionType: 'switch-season',
    });
  }

  if (primaryCause === 'capacity-overload' || primaryCause === 'overcommitment') {
    const activeHabits = habits.filter(h => !h.isPaused && !h.isKeystone && h.schedule === 'Daily');
    if (activeHabits.length > 0) {
      const target = activeHabits[0];
      actions.push({
        id: 'nba-pause-habit',
        label: mode === 'executive' ? `Pause "${target.title}"` : `Take a break from "${target.title}"`,
        description: mode === 'executive'
          ? 'Highest-impact single action to reduce daily load.'
          : 'Pausing this habit will give you the most immediate relief.',
        actionType: 'pause-habit',
        targetId: target.id,
      });
    }
  }

  if (primaryCause === 'energy-mismatch' || primaryCause === 'recovery-deficit') {
    actions.push({
      id: 'nba-min-version',
      label: mode === 'executive' ? 'Activate Minimum Versions' : 'Switch to lighter habit versions',
      description: mode === 'executive'
        ? 'Default all non-keystone habits to fallback versions.'
        : 'Use the easiest version of your habits today to conserve energy.',
      actionType: 'minimum-version',
    });
  }

  if (primaryCause === 'domain-neglect') {
    actions.push({
      id: 'nba-focus-domain',
      label: mode === 'executive' ? 'Run domain focus sprint' : 'Spend 15 minutes on your neglected domain',
      description: mode === 'executive'
        ? 'Targeted 15-minute action on the most neglected priority domain.'
        : 'A short focused session can restart momentum in a neglected area.',
      actionType: 'focus-domain',
    });
  }

  if (trajectory.corrections.length > 0 && actions.length < 3) {
    const correction = trajectory.corrections[0];
    if (!actions.some(a => a.actionType === correction.actionType)) {
      actions.push({
        id: `nba-trajectory-${correction.id}`,
        label: correction.label,
        description: correction.description,
        actionType: correction.actionType as MitigationActionType,
      });
    }
  }

  if (actions.length === 0) {
    actions.push({
      id: 'nba-steady',
      label: mode === 'executive' ? 'Hold course' : 'Keep your rhythm',
      description: mode === 'executive'
        ? 'No urgent actions needed. Maintain current operational parameters.'
        : 'Everything is on track. Keep showing up for your keystones and trust the process.',
      actionType: 'focus-domain',
    });
  }

  return actions.slice(0, 3);
}
