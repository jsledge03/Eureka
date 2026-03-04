import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";

type TimePeriod = 'morning' | 'day' | 'evening' | 'night';

const PALETTES: Record<TimePeriod, Record<string, string>> = {
  morning: {
    '--background': '35 40% 96%',
    '--foreground': '25 25% 15%',
    '--card': '40 30% 99%',
    '--card-foreground': '25 25% 15%',
    '--popover': '40 30% 99%',
    '--popover-foreground': '25 25% 15%',
    '--primary': '25 55% 52%',
    '--primary-foreground': '40 40% 97%',
    '--secondary': '45 30% 68%',
    '--secondary-foreground': '35 30% 18%',
    '--muted': '35 20% 90%',
    '--muted-foreground': '25 15% 45%',
    '--accent': '38 30% 86%',
    '--accent-foreground': '25 25% 15%',
    '--destructive': '0 50% 50%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '35 18% 85%',
    '--input': '35 18% 85%',
    '--ring': '25 55% 52%',
  },
  day: {
    '--background': '45 30% 97%',
    '--foreground': '20 20% 15%',
    '--card': '0 0% 100%',
    '--card-foreground': '20 20% 15%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '20 20% 15%',
    '--primary': '20 45% 55%',
    '--primary-foreground': '45 30% 97%',
    '--secondary': '130 15% 65%',
    '--secondary-foreground': '130 30% 15%',
    '--muted': '30 15% 90%',
    '--muted-foreground': '25 15% 45%',
    '--accent': '35 25% 85%',
    '--accent-foreground': '20 20% 15%',
    '--destructive': '0 50% 50%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '30 15% 85%',
    '--input': '30 15% 85%',
    '--ring': '20 45% 55%',
  },
  evening: {
    '--background': '30 20% 94%',
    '--foreground': '20 25% 12%',
    '--card': '30 15% 98%',
    '--card-foreground': '20 25% 12%',
    '--popover': '30 15% 98%',
    '--popover-foreground': '20 25% 12%',
    '--primary': '15 50% 48%',
    '--primary-foreground': '35 30% 96%',
    '--secondary': '35 35% 60%',
    '--secondary-foreground': '30 30% 15%',
    '--muted': '25 15% 87%',
    '--muted-foreground': '20 15% 40%',
    '--accent': '30 25% 82%',
    '--accent-foreground': '20 25% 12%',
    '--destructive': '0 50% 48%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '25 12% 80%',
    '--input': '25 12% 80%',
    '--ring': '15 50% 48%',
  },
  night: {
    '--background': '230 20% 14%',
    '--foreground': '220 15% 85%',
    '--card': '230 18% 18%',
    '--card-foreground': '220 15% 85%',
    '--popover': '230 18% 18%',
    '--popover-foreground': '220 15% 85%',
    '--primary': '25 45% 60%',
    '--primary-foreground': '230 20% 12%',
    '--secondary': '220 12% 35%',
    '--secondary-foreground': '220 15% 80%',
    '--muted': '230 15% 22%',
    '--muted-foreground': '220 10% 55%',
    '--accent': '230 12% 25%',
    '--accent-foreground': '220 15% 85%',
    '--destructive': '0 50% 50%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '230 12% 25%',
    '--input': '230 12% 25%',
    '--ring': '25 45% 60%',
  },
};

const THEME_META_COLORS: Record<TimePeriod, string> = {
  morning: '#f7f0e6',
  day: '#faf9f6',
  evening: '#ede6dc',
  night: '#1f2333',
};

function getTimePeriod(): TimePeriod {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function applyPalette(period: TimePeriod) {
  const root = document.documentElement;
  const palette = PALETTES[period];
  for (const [prop, value] of Object.entries(palette)) {
    root.style.setProperty(prop, value);
  }
  root.style.setProperty('color-scheme', period === 'night' ? 'dark' : 'light');
  if (period === 'night') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_META_COLORS[period]);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorTheme = useStore((s) => s.colorTheme);
  const lastApplied = useRef<string>('');

  useEffect(() => {
    function update() {
      const period: TimePeriod = colorTheme === 'auto' ? getTimePeriod() : colorTheme;
      if (lastApplied.current !== period) {
        lastApplied.current = period;
        applyPalette(period);
      }
    }
    update();

    if (colorTheme === 'auto') {
      const interval = setInterval(update, 60_000);
      return () => clearInterval(interval);
    }
  }, [colorTheme]);

  return <>{children}</>;
}

export { getTimePeriod };
export type { TimePeriod };
