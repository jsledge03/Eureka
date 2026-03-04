export type SeasonMode = 'Build' | 'Stabilize' | 'Recover' | 'Sprint' | 'Reposition' | 'Transition' | 'Maintenance' | 'Healing' | 'Exploration' | 'Leadership Peak' | 'Focus Sprint';

export interface SeasonConfig {
  graceDays: number;
  driftSensitivity: number;
  taskTarget: number;
  commitmentModifier: number;
  description: string;
  expectations: string[];
}

export const SEASON_DEFAULTS: Record<SeasonMode, SeasonConfig> = {
  Build: {
    graceDays: 2,
    driftSensitivity: 0.7,
    taskTarget: 5,
    commitmentModifier: 100,
    description: 'You are actively growing — adding new habits, pursuing goals, and stretching your capacity.',
    expectations: [
      'Higher task volume expected',
      'New habits may feel unstable at first',
      'Coach will push gently toward consistency',
      'Grace is available but used sparingly',
    ],
  },
  Stabilize: {
    graceDays: 3,
    driftSensitivity: 0.5,
    taskTarget: 4,
    commitmentModifier: 85,
    description: 'You are locking in progress — maintaining what works and refining your systems.',
    expectations: [
      'Focus on consistency over growth',
      'Coach will highlight habits losing momentum',
      'Moderate grace to absorb off-days',
      'Good time to audit friction and cues',
    ],
  },
  Recover: {
    graceDays: 5,
    driftSensitivity: 0.3,
    taskTarget: 2,
    commitmentModifier: 70,
    description: 'You are restoring energy — reducing load, being gentle, and protecting capacity.',
    expectations: [
      'Reduced expectations across the board',
      'Coach focuses on rest and self-compassion',
      'High grace allowance — no guilt',
      'Only keystone habits matter right now',
    ],
  },
  Sprint: {
    graceDays: 1,
    driftSensitivity: 0.9,
    taskTarget: 7,
    commitmentModifier: 110,
    description: 'You are pushing hard for a specific outcome — short-term intensity with a deadline.',
    expectations: [
      'High output, tight deadlines',
      'Coach will flag burnout risk early',
      'Minimal grace — every day counts',
      'Non-essential habits can be paused',
    ],
  },
  Reposition: {
    graceDays: 4,
    driftSensitivity: 0.4,
    taskTarget: 3,
    commitmentModifier: 90,
    description: 'You are rethinking direction — pivoting goals, re-evaluating identity, or navigating change.',
    expectations: [
      'Permission to pause and reflect deeply',
      'Coach encourages identity and value review',
      'Generous grace during transition',
      'Focus on clarity over productivity',
    ],
  },
  Transition: {
    graceDays: 4,
    driftSensitivity: 0.35,
    taskTarget: 3,
    commitmentModifier: 80,
    description: 'You are navigating a major life change — new job, move, relationship shift, or role change.',
    expectations: [
      'Routines may be disrupted — that is normal',
      'Coach will be gentle on consistency metrics',
      'Focus on anchoring 1-2 keystone habits',
      'High grace — stability comes before growth',
    ],
  },
  Maintenance: {
    graceDays: 3,
    driftSensitivity: 0.45,
    taskTarget: 4,
    commitmentModifier: 85,
    description: 'You are in cruise control — protecting established routines without adding new load.',
    expectations: [
      'No new commitments expected',
      'Coach monitors for silent drift',
      'Steady output with sustainable effort',
      'Good time to deepen existing habits',
    ],
  },
  Healing: {
    graceDays: 6,
    driftSensitivity: 0.2,
    taskTarget: 1,
    commitmentModifier: 60,
    description: 'You are healing — physically, emotionally, or mentally. The system protects you, not pushes you.',
    expectations: [
      'Minimal expectations — presence counts',
      'Coach focuses entirely on self-compassion',
      'Maximum grace — zero guilt allowed',
      'Only do what genuinely restores you',
    ],
  },
  Exploration: {
    graceDays: 3,
    driftSensitivity: 0.5,
    taskTarget: 4,
    commitmentModifier: 90,
    description: 'You are experimenting — trying new approaches, testing habits, and learning what works.',
    expectations: [
      'Permission to try and fail fast',
      'Coach will track what sticks vs. what drops',
      'Moderate grace for experimentation',
      'Focus on learning over perfection',
    ],
  },
  'Leadership Peak': {
    graceDays: 1,
    driftSensitivity: 0.85,
    taskTarget: 6,
    commitmentModifier: 115,
    description: 'You are leading at full capacity — high accountability, high output, high visibility.',
    expectations: [
      'Peak performance expected across domains',
      'Coach will watch burnout signals closely',
      'Minimal grace — excellence is the standard',
      'Protect sleep and recovery rituals fiercely',
    ],
  },
  'Focus Sprint': {
    graceDays: 1,
    driftSensitivity: 0.85,
    taskTarget: 5,
    commitmentModifier: 105,
    description: 'You are laser-focused on one domain or project — everything else takes a back seat.',
    expectations: [
      'Single-domain intensity with time-box',
      'Non-focus habits can be paused guilt-free',
      'Coach will flag if focus domain drifts',
      'Set a clear end date to prevent burnout',
    ],
  },
};

export function getSeasonDefaults(mode: SeasonMode): SeasonConfig {
  return SEASON_DEFAULTS[mode];
}

export function getSeasonDescription(mode: SeasonMode): string {
  return SEASON_DEFAULTS[mode].description;
}
