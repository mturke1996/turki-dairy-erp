/** ألوان مؤشرات موحّدة — StatTile و KpiCard */
export const METRIC_TONES = {
  navy: {
    icon: 'bg-navy-50 text-navy-700 ring-navy-100',
    bar: 'stat-accent-navy',
    text: 'text-navy-700',
  },
  meadow: {
    icon: 'bg-meadow-50 text-meadow-700 ring-meadow-100',
    bar: 'stat-accent-meadow',
    text: 'text-meadow-700',
  },
  sun: {
    icon: 'bg-sun-50 text-sun-800 ring-sun-100',
    bar: 'stat-accent-sun',
    text: 'text-sun-700',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-600 ring-rose-100',
    bar: 'stat-accent-rose',
    text: 'text-rose-600',
  },
  neutral: {
    icon: 'bg-canvas-sunken text-ink-mute ring-border',
    bar: 'stat-accent-navy',
    text: 'text-ink-mute',
  },
} as const;

export type MetricTone = keyof typeof METRIC_TONES;
