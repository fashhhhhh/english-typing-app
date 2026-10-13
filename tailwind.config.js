import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#3B82F6',
        },
        ink: '#0F172A',
        muted: '#64748B',
        faint: '#94A3B8',
        success: '#16A34A',
        danger: '#DC2626',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Montserrat', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
        'caret-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        shake: 'shake 0.18s ease-in-out',
        'caret-blink': 'caret-blink 1.1s step-end infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
