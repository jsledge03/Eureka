import type { Goal, Habit, Identity, CompletionLog, Domain } from "@/store/useStore";
import { DOMAINS } from "@/store/useStore";

export interface HabitRecommendation {
  id: string;
  title: string;
  why: string;
  trigger: string;
  fallback: string;
  domain: Domain;
  difficulty: number;
  goalId: string | null;
  goalTitle: string | null;
  reason: string;
  category: 'goal-gap' | 'domain-gap' | 'strengthen' | 'balance' | 'micro-upgrade';
}

const HABIT_TEMPLATES: Record<Domain, Array<{ title: string; why: string; trigger: string; fallback: string; difficulty: number }>> = {
  Physical: [
    { title: "Walk 20 minutes", why: "Improve cardiovascular health and clear the mind", trigger: "After lunch", fallback: "Walk to the mailbox and back", difficulty: 2 },
    { title: "Stretch for 10 minutes", why: "Reduce tension and increase flexibility", trigger: "After waking up", fallback: "Do 3 neck rolls", difficulty: 1 },
    { title: "Drink 8 glasses of water", why: "Stay hydrated for better energy and focus", trigger: "Every meal", fallback: "Drink 1 glass before bed", difficulty: 1 },
    { title: "Strength training 30 min", why: "Build resilience and functional strength", trigger: "Before morning shower", fallback: "Do 10 push-ups", difficulty: 3 },
    { title: "Sleep by 10:30 PM", why: "Maximize recovery and next-day performance", trigger: "After evening wind-down", fallback: "Put phone away by 10 PM", difficulty: 2 },
  ],
  Emotional: [
    { title: "Journal 3 gratitudes", why: "Train the mind to notice the good", trigger: "Before bed", fallback: "Think of 1 good thing today", difficulty: 1 },
    { title: "5-minute meditation", why: "Build emotional awareness and calm", trigger: "After morning coffee", fallback: "Take 3 deep breaths", difficulty: 2 },
    { title: "Check in with feelings", why: "Develop emotional intelligence", trigger: "At lunch break", fallback: "Name one emotion you feel right now", difficulty: 1 },
    { title: "Practice self-compassion note", why: "Reduce self-criticism and build resilience", trigger: "When feeling stressed", fallback: "Say one kind thing to yourself", difficulty: 2 },
  ],
  Mental: [
    { title: "Read 20 pages", why: "Expand knowledge and perspective", trigger: "Before bed", fallback: "Read 1 page", difficulty: 2 },
    { title: "Learn something new for 15 min", why: "Keep the mind sharp and curious", trigger: "During commute", fallback: "Watch one educational video", difficulty: 2 },
    { title: "Brain dump / free write 10 min", why: "Clear mental clutter and process thoughts", trigger: "After morning routine", fallback: "Write 3 sentences", difficulty: 1 },
    { title: "Practice a skill for 20 min", why: "Deepen expertise through deliberate practice", trigger: "After dinner", fallback: "Review notes for 5 min", difficulty: 3 },
  ],
  Social: [
    { title: "Reach out to one person", why: "Strengthen relationships and stay connected", trigger: "During lunch", fallback: "Send a quick thinking-of-you text", difficulty: 1 },
    { title: "Practice active listening", why: "Deepen connections through presence", trigger: "In next conversation", fallback: "Ask one follow-up question", difficulty: 2 },
    { title: "Express appreciation", why: "Build stronger bonds through gratitude", trigger: "Before leaving work/home", fallback: "Say thank you to someone", difficulty: 1 },
  ],
  Spiritual: [
    { title: "Morning reflection 10 min", why: "Connect with purpose and meaning", trigger: "Before checking phone", fallback: "Take 1 minute of silence", difficulty: 2 },
    { title: "Practice mindfulness", why: "Stay present and grounded", trigger: "During daily walk", fallback: "Notice 3 things around you", difficulty: 1 },
    { title: "Evening intention review", why: "Align actions with deeper values", trigger: "Before bed", fallback: "Ask: Did I live by my values today?", difficulty: 1 },
  ],
  Career: [
    { title: "Deep work block 90 min", why: "Make meaningful progress on important projects", trigger: "First thing at work", fallback: "Focus on one task for 15 min", difficulty: 3 },
    { title: "Plan tomorrow's priorities", why: "Start each day with clarity and direction", trigger: "End of work day", fallback: "Write down 1 priority for tomorrow", difficulty: 1 },
    { title: "Network or mentor check-in", why: "Grow professionally through relationships", trigger: "Weekly on Wednesday", fallback: "Comment on a colleague's work", difficulty: 2 },
  ],
  Financial: [
    { title: "Track daily spending", why: "Build awareness of money habits", trigger: "Before bed", fallback: "Review one transaction", difficulty: 1 },
    { title: "Review financial goals", why: "Stay aligned with long-term financial health", trigger: "Sunday evening", fallback: "Check account balance", difficulty: 1 },
    { title: "Learn about investing 15 min", why: "Build financial literacy for long-term wealth", trigger: "During lunch break", fallback: "Read one finance article headline", difficulty: 2 },
  ],
};

function getCompletionRate(habitId: string, logs: CompletionLog[], days: number = 14): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toLocaleDateString('en-CA');

  const relevantLogs = logs.filter(l =>
    l.type === 'habit' && l.refId === habitId && l.date >= cutoffStr
  );

  if (relevantLogs.length === 0) return 0;
  const completed = relevantLogs.filter(l => l.status === 'completed' || l.status === 'micro').length;
  return completed / relevantLogs.length;
}

function getDomainActivity(logs: CompletionLog[], habits: Habit[], days: number = 14): Map<Domain, number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toLocaleDateString('en-CA');

  const habitMap = new Map(habits.map(h => [h.id, h]));
  const domainCounts = new Map<Domain, number>();

  logs.filter(l => l.type === 'habit' && l.date >= cutoffStr && (l.status === 'completed' || l.status === 'micro'))
    .forEach(l => {
      const habit = habitMap.get(l.refId);
      if (habit?.domain) {
        domainCounts.set(habit.domain, (domainCounts.get(habit.domain) || 0) + 1);
      }
    });

  return domainCounts;
}

function getStrongDomains(habits: Habit[], logs: CompletionLog[]): Domain[] {
  const domainRates = new Map<Domain, number[]>();

  habits.filter(h => !h.isPaused && h.domain).forEach(h => {
    const rate = getCompletionRate(h.id, logs);
    if (rate > 0) {
      const d = h.domain!;
      if (!domainRates.has(d)) domainRates.set(d, []);
      domainRates.get(d)!.push(rate);
    }
  });

  const strong: Domain[] = [];
  domainRates.forEach((rates, domain) => {
    const avg = rates.reduce((s, r) => s + r, 0) / rates.length;
    if (avg >= 0.7) strong.push(domain);
  });

  return strong;
}

export function generateRecommendations(
  goals: Goal[],
  habits: Habit[],
  identities: Identity[],
  logs: CompletionLog[],
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];
  const existingTitles = new Set(habits.map(h => h.title.toLowerCase()));

  const makeId = (category: string, domain: string, title: string) =>
    `rec-${category}-${domain}-${title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`;

  const isDuplicate = (title: string) =>
    existingTitles.has(title.toLowerCase());

  const activeGoals = goals.filter(g => !g.isPaused);
  const activeHabits = habits.filter(h => !h.isPaused);
  const activeIdentity = identities.find(i => i.isActive);

  const goalsWithHabits = new Set(activeHabits.map(h => h.goalId).filter(Boolean));
  const unservedGoals = activeGoals.filter(g => !goalsWithHabits.has(g.id));

  unservedGoals.forEach(goal => {
    if (!goal.domain) return;
    const templates = HABIT_TEMPLATES[goal.domain] || [];
    const template = templates.find(t => !isDuplicate(t.title));
    if (template) {
      recommendations.push({
        id: makeId('goal-gap', goal.domain, template.title),
        ...template,
        domain: goal.domain,
        goalId: goal.id,
        goalTitle: goal.title,
        reason: `Your goal "${goal.title}" doesn't have any habits linked yet`,
        category: 'goal-gap',
      });
    }
  });

  const habitDomains = new Set(activeHabits.map(h => h.domain).filter((d): d is Domain => d !== null));
  const goalDomains = activeGoals.map(g => g.domain).filter((d): d is Domain => d !== null);
  const emphasizedDomains = activeIdentity?.domainEmphasis
    ? Object.entries(activeIdentity.domainEmphasis)
        .filter(([, w]) => (w as number) > 0)
        .map(([d]) => d as Domain)
    : [];

  const relevantDomains = Array.from(new Set([...goalDomains, ...emphasizedDomains]));

  relevantDomains.forEach(domain => {
    if (habitDomains.has(domain)) return;
    const templates = HABIT_TEMPLATES[domain] || [];
    const template = templates.find(t => !isDuplicate(t.title));
    if (template) {
      const goalInDomain = activeGoals.find(g => g.domain === domain);
      recommendations.push({
        id: makeId('domain-gap', domain, template.title),
        ...template,
        domain,
        goalId: goalInDomain?.id || null,
        goalTitle: goalInDomain?.title || null,
        reason: `You have no habits in ${domain} yet — this domain is part of your growth plan`,
        category: 'domain-gap',
      });
    }
  });

  const strongDomains = getStrongDomains(habits, logs);
  strongDomains.forEach(domain => {
    const templates = HABIT_TEMPLATES[domain] || [];
    const existingInDomain = activeHabits.filter(h => h.domain === domain);
    if (existingInDomain.length === 0 || existingInDomain.length >= 4) return;

    const minDifficulty = Math.min(...existingInDomain.map(h => h.difficulty));
    const template = templates.find(t =>
      !isDuplicate(t.title) && t.difficulty > minDifficulty
    );
    if (template) {
      const goalInDomain = activeGoals.find(g => g.domain === domain);
      recommendations.push({
        id: makeId('strengthen', domain, template.title),
        ...template,
        domain,
        goalId: goalInDomain?.id || null,
        goalTitle: goalInDomain?.title || null,
        reason: `You're doing great in ${domain} — ready for the next level`,
        category: 'strengthen',
      });
    }
  });

  const domainActivity = getDomainActivity(logs, habits);
  const activeDomainsList = Array.from(habitDomains);
  if (activeDomainsList.length >= 2) {
    const avgActivity = activeDomainsList.reduce((s, d) => s + (domainActivity.get(d) || 0), 0) / activeDomainsList.length;
    const weakDomains = activeDomainsList.filter(d => (domainActivity.get(d) || 0) < avgActivity * 0.4);

    weakDomains.forEach(domain => {
      const existingInDomain = activeHabits.filter(h => h.domain === domain);
      const templates = HABIT_TEMPLATES[domain] || [];
      const easyTemplate = templates.find(t => !isDuplicate(t.title) && t.difficulty <= 2);
      if (easyTemplate && existingInDomain.length < 4) {
        const goalInDomain = activeGoals.find(g => g.domain === domain);
        recommendations.push({
          id: makeId('balance', domain, easyTemplate.title),
          ...easyTemplate,
          domain,
          goalId: goalInDomain?.id || null,
          goalTitle: goalInDomain?.title || null,
          reason: `${domain} activity has been low — an easy habit can reignite momentum`,
          category: 'balance',
        });
      }
    });
  }

  const strugglingHabits = activeHabits.filter(h => {
    if (h.isMicro) return false;
    const rate = getCompletionRate(h.id, logs);
    return rate > 0 && rate < 0.4 && h.difficulty >= 3;
  });

  strugglingHabits.slice(0, 2).forEach(habit => {
    if (!habit.domain) return;
    const templates = HABIT_TEMPLATES[habit.domain] || [];
    const microTemplate = templates.find(t => !isDuplicate(t.title) && t.difficulty === 1);
    if (microTemplate) {
      recommendations.push({
        id: makeId('micro-upgrade', habit.domain, microTemplate.title),
        ...microTemplate,
        domain: habit.domain,
        goalId: habit.goalId,
        goalTitle: activeGoals.find(g => g.id === habit.goalId)?.title || null,
        reason: `"${habit.title}" has been tough — try a lighter version to rebuild momentum`,
        category: 'micro-upgrade',
      });
    }
  });

  const seen = new Set<string>();
  return recommendations.filter(r => {
    const key = r.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}
