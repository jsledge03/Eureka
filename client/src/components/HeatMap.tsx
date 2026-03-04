import { useMemo, useState } from "react";
import type { HeatMapDay } from "@/lib/trendEngine";
import { cn } from "@/lib/utils";

interface HeatMapProps {
  data: HeatMapDay[];
  className?: string;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getIntensity(rate: number): number {
  if (rate === 0) return 0;
  if (rate < 0.25) return 1;
  if (rate < 0.5) return 2;
  if (rate < 0.75) return 3;
  return 4;
}

const INTENSITY_CLASSES = [
  'bg-muted-foreground/[0.06]',
  'bg-emerald-500/20',
  'bg-emerald-500/40',
  'bg-emerald-500/60',
  'bg-emerald-500/80',
];

export function HeatMap({ data, className = "" }: HeatMapProps) {
  const [hoveredDay, setHoveredDay] = useState<HeatMapDay | null>(null);

  const { weeks, monthMarkers } = useMemo(() => {
    if (data.length === 0) return { weeks: [], monthMarkers: [] };

    const firstDate = new Date(data[0].date + 'T00:00:00');
    const startDow = firstDate.getDay();

    const paddedData: (HeatMapDay | null)[] = [];
    for (let i = 0; i < startDow; i++) {
      paddedData.push(null);
    }
    paddedData.push(...data);

    const weeksList: (HeatMapDay | null)[][] = [];
    for (let i = 0; i < paddedData.length; i += 7) {
      const week = paddedData.slice(i, i + 7);
      while (week.length < 7) week.push(null);
      weeksList.push(week);
    }

    const markers: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    for (let wi = 0; wi < weeksList.length; wi++) {
      const firstInWeek = weeksList[wi].find(d => d !== null);
      if (firstInWeek) {
        const m = new Date(firstInWeek.date + 'T00:00:00').getMonth();
        if (m !== lastMonth) {
          markers.push({ weekIndex: wi, label: MONTH_LABELS[m] });
          lastMonth = m;
        }
      }
    }

    return { weeks: weeksList, monthMarkers: markers };
  }, [data]);

  if (data.length === 0) return null;

  const totalCompleted = data.reduce((s, d) => s + d.completed, 0);
  const activeDays = data.filter(d => d.completed > 0).length;

  return (
    <div className={cn("space-y-2", className)} data-testid="heatmap-container">
      <div className="flex items-start gap-1">
        <div className="flex flex-col gap-[3px] text-[8px] text-muted-foreground/50 pr-1 pt-[18px] shrink-0">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-[10px] flex items-center leading-none w-3 justify-end">{i % 2 === 1 ? label : ''}</div>
          ))}
        </div>
        <div className="flex-1 overflow-x-auto">
          <div className="relative min-w-0">
            <div className="h-[14px] relative">
              {monthMarkers.map((m, i) => (
                <span
                  key={i}
                  className="text-[8px] text-muted-foreground/50 absolute whitespace-nowrap"
                  style={{ left: `${m.weekIndex * 13}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={cn(
                        "w-[10px] h-[10px] rounded-[2px] transition-all",
                        day ? INTENSITY_CLASSES[getIntensity(day.completionRate)] : "bg-transparent",
                        day && hoveredDay?.date === day.date && "ring-1 ring-foreground/30 scale-125"
                      )}
                      onMouseEnter={() => day && setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onTouchStart={() => day && setHoveredDay(day)}
                      onTouchEnd={() => setHoveredDay(null)}
                      data-testid={day ? `heatmap-cell-${day.date}` : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {hoveredDay ? (
            <p className="text-[10px] text-foreground/70 font-medium" data-testid="heatmap-tooltip">
              {new Date(hoveredDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}
              {hoveredDay.completed}/{hoveredDay.total} habits
              {hoveredDay.completionRate > 0 && ` · ${Math.round(hoveredDay.completionRate * 100)}%`}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 font-medium" data-testid="heatmap-summary">
              {totalCompleted} completions · {activeDays} active days
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-muted-foreground/40">Less</span>
          {INTENSITY_CLASSES.map((cls, i) => (
            <div key={i} className={cn("w-[8px] h-[8px] rounded-[2px]", cls)} />
          ))}
          <span className="text-[8px] text-muted-foreground/40">More</span>
        </div>
      </div>
    </div>
  );
}
