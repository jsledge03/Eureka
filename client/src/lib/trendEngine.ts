import type { CompletionLog, Habit } from '@/store/useStore';

export interface TrendPoint {
  date: string;
  value: number;
}

function dateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-CA');
}

interface DailyAgg {
  habitTotal: number;
  habitGood: number;
  taskTotal: number;
  taskGood: number;
}

function aggregateLogsByDate(logs: CompletionLog[]): Map<string, DailyAgg> {
  const map = new Map<string, DailyAgg>();
  for (const l of logs) {
    let agg = map.get(l.date);
    if (!agg) {
      agg = { habitTotal: 0, habitGood: 0, taskTotal: 0, taskGood: 0 };
      map.set(l.date, agg);
    }
    if (l.type === 'habit') {
      agg.habitTotal++;
      if (l.status === 'completed' || l.status === 'micro') agg.habitGood++;
    } else {
      agg.taskTotal++;
      if (l.status === 'completed') agg.taskGood++;
    }
  }
  return map;
}

function buildDateList(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(dateString(i));
  }
  return dates;
}

export function computeRhythmTrend(
  logs: CompletionLog[],
  days: number = 30
): TrendPoint[] {
  const windowSize = 14;
  const totalDays = days + windowSize;
  const allDates = buildDateList(totalDays);
  const aggMap = aggregateLogsByDate(logs);

  const habitTotals: number[] = [];
  const habitGoods: number[] = [];
  const taskTotals: number[] = [];
  const taskGoods: number[] = [];
  for (const date of allDates) {
    const agg = aggMap.get(date);
    habitTotals.push(agg?.habitTotal ?? 0);
    habitGoods.push(agg?.habitGood ?? 0);
    taskTotals.push(agg?.taskTotal ?? 0);
    taskGoods.push(agg?.taskGood ?? 0);
  }

  const prefixSum = (arr: number[]) => {
    const s = [0];
    for (let i = 0; i < arr.length; i++) s.push(s[i] + arr[i]);
    return s;
  };
  const htPre = prefixSum(habitTotals);
  const hgPre = prefixSum(habitGoods);
  const ttPre = prefixSum(taskTotals);
  const tgPre = prefixSum(taskGoods);

  const rangeSum = (pre: number[], start: number, end: number) => pre[end + 1] - pre[start];

  const points: TrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const endIdx = windowSize + i;
    const startIdx = endIdx - windowSize + 1;
    const ht = rangeSum(htPre, startIdx, endIdx);
    const hg = rangeSum(hgPre, startIdx, endIdx);
    const tt = rangeSum(ttPre, startIdx, endIdx);
    const tg = rangeSum(tgPre, startIdx, endIdx);

    const habitScore = ht > 0 ? (hg / ht) * 100 : 0;
    const taskScore = tt > 0 ? (tg / tt) * 100 : 0;

    let score = 0;
    if (ht === 0 && tt === 0) score = 0;
    else if (ht === 0) score = Math.round(taskScore);
    else if (tt === 0) score = Math.round(habitScore);
    else score = Math.round(habitScore * 0.7 + taskScore * 0.3);

    points.push({ date: allDates[endIdx], value: score });
  }

  return points;
}

export function computeMomentumTrend(
  logs: CompletionLog[],
  days: number = 30
): TrendPoint[] {
  const windowSize = 7;
  const totalDays = days + windowSize;
  const allDates = buildDateList(totalDays);
  const aggMap = aggregateLogsByDate(logs);

  const totals: number[] = [];
  const goods: number[] = [];
  for (const date of allDates) {
    const agg = aggMap.get(date);
    const t = (agg?.habitTotal ?? 0) + (agg?.taskTotal ?? 0);
    const g = (agg?.habitGood ?? 0) + (agg?.taskGood ?? 0);
    totals.push(t);
    goods.push(g);
  }

  const tPre = [0];
  const gPre = [0];
  for (let i = 0; i < totals.length; i++) {
    tPre.push(tPre[i] + totals[i]);
    gPre.push(gPre[i] + goods[i]);
  }

  const points: TrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const endIdx = windowSize + i;
    const startIdx = endIdx - windowSize + 1;
    const total = tPre[endIdx + 1] - tPre[startIdx];
    const good = gPre[endIdx + 1] - gPre[startIdx];
    const value = total > 0 ? Math.round((good / total) * 100) : 0;
    points.push({ date: allDates[endIdx], value });
  }

  return points;
}

export interface HeatMapDay {
  date: string;
  completionRate: number;
  completed: number;
  total: number;
}

export function computeHabitHeatMap(
  habits: Habit[],
  logs: CompletionLog[],
  days: number = 90
): HeatMapDay[] {
  const allHabitIds = new Set(habits.map(h => h.id));
  const activeCount = habits.filter(h => !h.isPaused).length || 1;

  const logsByDate = new Map<string, { completed: number; logged: number }>();
  for (const l of logs) {
    if (l.type !== 'habit') continue;
    if (!allHabitIds.has(l.refId)) continue;
    let entry = logsByDate.get(l.date);
    if (!entry) {
      entry = { completed: 0, logged: 0 };
      logsByDate.set(l.date, entry);
    }
    entry.logged++;
    if (l.status === 'completed' || l.status === 'micro') entry.completed++;
  }

  const result: HeatMapDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dateString(i);
    const entry = logsByDate.get(date);
    const completed = entry?.completed ?? 0;
    const total = Math.max(entry?.logged ?? 0, activeCount);
    const rate = total > 0 ? Math.min(1, completed / total) : 0;
    result.push({ date, completionRate: rate, completed, total });
  }

  return result;
}
