import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: '1.5rem' },
    extend: {
      fontFamily: {
        sans: ['var(--font-arabic)', 'var(--font-latin)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        canvas: {
          DEFAULT: 'hsl(var(--canvas))',
          raised: 'hsl(var(--canvas-raised))',
          sunken: 'hsl(var(--canvas-sunken))',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          soft: 'hsl(var(--ink-soft))',
          mute: 'hsl(var(--ink-mute))',
          line: 'hsl(var(--border))',
          subtle: 'hsl(var(--secondary))',
        },

        /**
         * هوية مصنع التركي على ثيم Fluxen التحريري:
         * `navy.*` يُعاد توجيهه إلى محايدات فحمية (اللون الأساسي)،
         * `meadow.*` إلى المرجاني (اللمسة الوحيدة)، و`sun.*` إلى الذهبي الدافئ —
         * كي تبقى أسماء الأصناف ثابتة دون إعادة تسمية في كامل المستودع.
         */
        navy: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#525252',
          600: '#404040',
          700: '#171717',
          800: '#0f0f0f',
          900: '#0a0a0a',
          950: '#050505',
        },
        /** المرجاني التحريري — اللمسة اللونية الوحيدة */
        meadow: {
          50: '#fdeceb',
          100: '#fbdad8',
          200: '#f5b6b1',
          300: '#ee9089',
          400: '#e56a61',
          500: '#D94841',
          600: '#bf3a34',
          700: '#9e2f2a',
          800: '#7c2521',
          900: '#5d1c19',
        },
        /** الذهبي الدافئ — للتنبيهات والهوامش */
        sun: {
          50: '#fbf8f1',
          100: '#f8f1da',
          200: '#efe0b0',
          300: '#e2c97f',
          400: '#d3ae4f',
          500: '#bd9333',
          600: '#9c7a2a',
          700: '#7a5c0f',
          800: '#5e470b',
          900: '#4a380a',
        },
        /** أسطح كريمية دافئة */
        milk: {
          50: '#fbf8f1',
          100: '#f4eedd',
          200: '#e8dec2',
          300: '#d7c699',
        },
        /** خرائط توافقية مطابقة لـ Fluxen */
        sage: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#D94841',
          600: '#525252',
          700: '#171717',
          800: '#0f0f0f',
          900: '#0a0a0a',
        },
        sand: {
          50: '#FBF8F1',
          100: '#F4EEDD',
          200: '#E8DEC2',
          300: '#D7C699',
          400: '#C5B07A',
          500: '#A89253',
          600: '#8B7943',
          700: '#6E6035',
        },
        pastel: {
          green: '#EDF3EC',
          greenInk: '#2F5234',
          red: '#FBEDEC',
          redInk: '#8A2F2D',
          blue: '#E7F0F7',
          blueInk: '#1F4F73',
          yellow: '#F8F1DA',
          yellowInk: '#7A5C0F',
          plum: '#F1E9F1',
          plumInk: '#5E3A66',
        },
      },
      boxShadow: {
        hairline: '0 0 0 1px hsl(var(--border))',
        whisper: '0 1px 1px rgba(20, 22, 25, 0.025), 0 0 0 1px hsl(var(--border))',
        lift: '0 1px 2px rgba(20, 22, 25, 0.04), 0 8px 24px -16px rgba(20, 22, 25, 0.06)',
        focus: '0 0 0 3px rgba(211, 47, 47, 0.18)',
        glow: '0 8px 30px -10px rgba(217, 72, 65, 0.30)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': 'calc(var(--radius) + 6px)',
        '3xl': 'calc(var(--radius) + 12px)',
      },
      letterSpacing: {
        tightest: '-0.045em',
        tight: '-0.02em',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -5px, 0)' },
        },
        'splash-dot': {
          '0%, 80%, 100%': { opacity: '0.35', transform: 'scale(0.85)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
        'splash-progress': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        drift: 'drift 16s ease-in-out infinite',
        'splash-dot': 'splash-dot 1.2s ease-in-out infinite both',
        'splash-progress': 'splash-progress 1.6s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
