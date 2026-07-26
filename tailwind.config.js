/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dusk: {
          950: '#0B1826',
          900: '#0F2036',
          800: '#12233A',
          700: '#1B3450',
          600: '#254767',
          500: '#33607F',
        },
        marigold: {
          400: '#FFC857',
          500: '#F5A524',
          600: '#DB8A12',
        },
        betel: {
          500: '#4C8C4A',
          600: '#3B6E3A',
        },
        clay: {
          500: '#C1502E',
          600: '#A03F23',
        },
        cream: {
          100: '#F4EEDF',
          200: '#E9DFC6',
        },
      },
      fontFamily: {
        display: ['"Baloo 2"', 'ui-rounded', 'sans-serif'],
        body: ['Manrope', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        signboard: '0 6px 0 rgba(0,0,0,0.35), 0 18px 30px -10px rgba(0,0,0,0.55)',
        tile: '0 3px 0 rgba(0,0,0,0.25), 0 8px 16px -4px rgba(0,0,0,0.4)',
        tileup: '0 5px 0 rgba(0,0,0,0.3), 0 14px 22px -6px rgba(0,0,0,0.5)',
      },
      keyframes: {
        popIn: {
          '0%': { transform: 'scale(0.4) translateY(10px)', opacity: '0' },
          '70%': { transform: 'scale(1.08) translateY(-2px)', opacity: '1' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        matchOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '60%': { transform: 'scale(1.25)', opacity: '1' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
        drift: {
          '0%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
          '100%': { transform: 'translateY(0px)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        hintPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245,165,36,0.65)', transform: 'scale(1)' },
          '50%': { boxShadow: '0 0 0 10px rgba(245,165,36,0)', transform: 'scale(1.06)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(4px) scale(0.85)', opacity: '0' },
          '20%': { transform: 'translateY(-6px) scale(1.05)', opacity: '1' },
          '80%': { transform: 'translateY(-30px) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-46px) scale(0.95)', opacity: '0' },
        },
        achievementSlideUp: {
          '0%': { transform: 'translateY(120%) scale(0.9)', opacity: '0' },
          '55%': { transform: 'translateY(-8%) scale(1.03)', opacity: '1' },
          '75%': { transform: 'translateY(3%) scale(0.99)', opacity: '1' },
          '100%': { transform: 'translateY(0%) scale(1)', opacity: '1' },
        },
      },
      animation: {
        popIn: 'popIn 260ms cubic-bezier(.2,.9,.3,1.3) both',
        matchOut: 'matchOut 320ms ease-in forwards',
        shake: 'shake 340ms ease-in-out',
        drift: 'drift 6s ease-in-out infinite',
        glow: 'glow 3.2s ease-in-out infinite',
        hintPulse: 'hintPulse 900ms ease-in-out infinite',
        floatUp: 'floatUp 900ms ease-out forwards',
        achievementSlideUp: 'achievementSlideUp 700ms cubic-bezier(.34,1.56,.64,1) both',
      },
    },
  },
  plugins: [],
};
