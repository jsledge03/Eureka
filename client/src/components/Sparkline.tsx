import { useMemo } from "react";
import type { TrendPoint } from "@/lib/trendEngine";

interface SparklineProps {
  data: TrendPoint[];
  width?: number;
  height?: number;
  color?: string;
  gradientId?: string;
  showDot?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "hsl(var(--primary))",
  gradientId,
  showDot = true,
  className = "",
}: SparklineProps) {
  const { path, fillPath, lastPoint, hasData } = useMemo(() => {
    const values = data.map(d => d.value);
    if (values.length < 2 || values.every(v => v === 0)) {
      return { path: "", fillPath: "", lastPoint: null, hasData: false };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const padding = 4;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    const points = values.map((v, i) => ({
      x: padding + (i / (values.length - 1)) * plotW,
      y: padding + plotH - ((v - min) / range) * plotH,
    }));

    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
      d += ` C ${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
    }

    const last = points[points.length - 1];
    const fillD = d + ` L ${last.x},${height} L ${points[0].x},${height} Z`;

    return { path: d, fillPath: fillD, lastPoint: last, hasData: true };
  }, [data, width, height]);

  if (!hasData) {
    return (
      <svg width={width} height={height} className={className}>
        <line
          x1={4} y1={height / 2} x2={width - 4} y2={height / 2}
          stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.15}
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const gId = gradientId || `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {showDot && lastPoint && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={color} />
      )}
    </svg>
  );
}
