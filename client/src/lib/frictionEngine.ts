import type { FrictionEvent, Habit, Task, ReasonTag } from '@/store/useStore';

export interface FrictionInsights {
  topReasons: { tag: ReasonTag; count: number; percentage: number }[];
  topEntities: { entityId: string; entityTitle: string; entityType: 'habit' | 'task'; count: number }[];
  suggestions: FrictionSuggestion[];
}

export interface FrictionSuggestion {
  type: 'reschedule' | 'add-cue' | 'minimum-version' | 'reduce-frequency' | 'create-supporting-task';
  entityId: string;
  entityTitle: string;
  message: string;
}

export function computeFrictionInsights(
  events: FrictionEvent[],
  habits: Habit[],
  tasks: Task[]
): FrictionInsights {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffKey = cutoff.toLocaleDateString('en-CA');

  const recentEvents = events.filter(e => e.dateKey >= cutoffKey);

  if (recentEvents.length === 0) {
    return { topReasons: [], topEntities: [], suggestions: [] };
  }

  const reasonCounts = new Map<ReasonTag, number>();
  for (const e of recentEvents) {
    reasonCounts.set(e.reasonTag, (reasonCounts.get(e.reasonTag) ?? 0) + 1);
  }
  const topReasons = Array.from(reasonCounts.entries())
    .map(([tag, count]) => ({ tag, count, percentage: Math.round((count / recentEvents.length) * 100) }))
    .sort((a, b) => b.count - a.count);

  const entityCounts = new Map<string, { entityId: string; entityTitle: string; entityType: 'habit' | 'task'; count: number }>();
  for (const e of recentEvents) {
    const key = `${e.entityType}:${e.entityId}`;
    const existing = entityCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      entityCounts.set(key, { entityId: e.entityId, entityTitle: e.entityTitle, entityType: e.entityType, count: 1 });
    }
  }
  const topEntities = Array.from(entityCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const suggestions: FrictionSuggestion[] = [];

  for (const entity of topEntities) {
    if (entity.count < 2) continue;

    const entityEvents = recentEvents.filter(e => e.entityId === entity.entityId && e.entityType === entity.entityType);
    const reasons = entityEvents.map(e => e.reasonTag);

    if (reasons.includes('Time')) {
      suggestions.push({
        type: 'reschedule',
        entityId: entity.entityId,
        entityTitle: entity.entityTitle,
        message: `Reschedule "${entity.entityTitle}" to a time with fewer conflicts`,
      });
    }

    if (reasons.includes('Energy') || reasons.includes('Overload')) {
      if (entity.entityType === 'habit') {
        const habit = habits.find(h => h.id === entity.entityId);
        if (habit && !habit.isMicro) {
          suggestions.push({
            type: 'minimum-version',
            entityId: entity.entityId,
            entityTitle: entity.entityTitle,
            message: `Convert "${entity.entityTitle}" to its Minimum Version on low-energy days`,
          });
        }
      }
    }

    if (reasons.includes('Forgetfulness')) {
      suggestions.push({
        type: 'add-cue',
        entityId: entity.entityId,
        entityTitle: entity.entityTitle,
        message: `Add a visible cue or trigger for "${entity.entityTitle}"`,
      });
    }

    if (entity.entityType === 'habit' && entity.count >= 3) {
      const habit = habits.find(h => h.id === entity.entityId);
      if (habit && habit.schedule === 'Daily') {
        suggestions.push({
          type: 'reduce-frequency',
          entityId: entity.entityId,
          entityTitle: entity.entityTitle,
          message: `Reduce frequency of "${entity.entityTitle}" — daily may be too ambitious right now`,
        });
      }
    }

    if (reasons.includes('Environment') || reasons.includes('Unclear')) {
      suggestions.push({
        type: 'create-supporting-task',
        entityId: entity.entityId,
        entityTitle: entity.entityTitle,
        message: `Create a supporting task to remove blockers for "${entity.entityTitle}"`,
      });
    }
  }

  const seen = new Set<string>();
  const uniqueSuggestions = suggestions.filter(s => {
    const key = `${s.type}:${s.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { topReasons, topEntities, suggestions: uniqueSuggestions };
}
