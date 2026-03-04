import type { ProofEvent, ProofSource } from '@/store/useStore';

interface ProofContext {
  habitId?: string;
  habitTitle?: string;
  goalId?: string;
  goalTitle?: string;
  taskId?: string;
  taskTitle?: string;
  domain?: string;
  isKeystone?: boolean;
  isMinimumVersion?: boolean;
  streakDays?: number;
  streakLabel?: string;
}

interface StoreSlice {
  identities: { id: string; statement: string; futureSelf: string; values: string[]; isActive: boolean }[];
  goals?: { id: string; identityId: string | null }[];
  getActiveIdentity: () => { statement: string; futureSelf: string; values: string[] } | undefined;
  getActiveIdentities?: () => { statement: string; futureSelf: string; values: string[] }[];
}

function getIdentityLink(store: StoreSlice, goalId?: string): string {
  if (goalId && store.goals) {
    const goal = store.goals.find(g => g.id === goalId);
    if (goal?.identityId) {
      const linked = store.identities.find(i => i.id === goal.identityId && i.isActive);
      if (linked) {
        return linked.futureSelf || linked.statement || 'your best self';
      }
    }
  }

  const identities = store.getActiveIdentities?.() || [];
  if (identities.length > 1) {
    const refs = identities.map(i => i.futureSelf || i.statement).filter(Boolean);
    if (refs.length > 1) return refs.join(' & ');
    if (refs.length === 1) return refs[0];
  }
  const identity = store.getActiveIdentity();
  if (!identity) return 'your best self';
  if (identity.futureSelf) return identity.futureSelf;
  if (identity.statement) return identity.statement;
  return 'your best self';
}

export function generateProofEvent(
  source: ProofSource,
  context: ProofContext,
  store: StoreSlice
): Omit<ProofEvent, 'id'> {
  const dateKey = new Date().toLocaleDateString('en-CA');
  const identityRef = getIdentityLink(store, context.goalId);

  let title = '';
  let whyItMatters = '';

  switch (source) {
    case 'habit-completion': {
      const name = context.habitTitle || 'a habit';
      if (context.isKeystone) {
        title = `Completed keystone habit: ${name}`;
        whyItMatters = `Keystone habits have outsized impact. Completing "${name}" reinforces who you're becoming — ${identityRef}.`;
      } else {
        title = `Completed habit: ${name}`;
        whyItMatters = `Consistent action on "${name}" builds the identity of ${identityRef}.`;
      }
      break;
    }

    case 'goal-task': {
      const taskName = context.taskTitle || 'a task';
      const goalName = context.goalTitle || 'a goal';
      title = `Completed "${taskName}" toward ${goalName}`;
      whyItMatters = `Every task completed toward "${goalName}" is evidence you're becoming ${identityRef}.`;
      break;
    }

    case 'wise-adaptation': {
      const name = context.habitTitle || 'a habit';
      title = `Chose Minimum Version for ${name}`;
      whyItMatters = `Adapting instead of skipping shows self-awareness. Doing the minimum of "${name}" keeps momentum alive — that's what ${identityRef} would do.`;
      break;
    }

    case 'sunday-reset': {
      title = 'Completed Sunday Reset';
      whyItMatters = `Taking time to reflect and recalibrate is a leadership move. ${identityRef} stays intentional, not reactive.`;
      break;
    }

    case 'close-the-loop': {
      title = 'Closed the loop on the day';
      whyItMatters = `Finishing the day with reflection shows discipline. ${identityRef} doesn't leave loose ends.`;
      break;
    }

    case 'triage': {
      title = 'Triaged and reprioritized tasks';
      whyItMatters = `Actively managing priorities instead of being overwhelmed — that's how ${identityRef} operates.`;
      break;
    }

    case 'streak-milestone': {
      const name = context.habitTitle || 'a habit';
      const days = context.streakDays || 0;
      const label = context.streakLabel || `${days}-day streak`;
      title = `${label}: ${days} days of "${name}"`;
      whyItMatters = `${days} consecutive days of "${name}" is undeniable proof you're becoming ${identityRef}. Streaks build identity.`;
      break;
    }

    default: {
      title = 'Identity-aligned action';
      whyItMatters = `Another step toward becoming ${identityRef}.`;
    }
  }

  return {
    dateKey,
    title,
    linkedGoalId: context.goalId,
    linkedHabitId: context.habitId,
    linkedTaskId: context.taskId,
    domain: context.domain,
    whyItMatters,
    source,
  };
}
