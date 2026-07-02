/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#000000',
          charcoal: '#0A0A0B',
          layer: '#141416',
          line: '#232326'
        },
        stage: {
          early: '#FF3B30',
          earlyDim: '#7A1410',
          progress: '#BF5AF2',
          progressDim: '#4B1A66',
          freedom: '#FFD700',
          freedomDim: '#6B5800'
        },
        mint: '#30D158'
      },
      fontFamily: {
        display: ['Inter', '"SF Pro Display"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        arabic: ['"IBM Plex Sans Arabic"', 'Tahoma', 'sans-serif']
      },
      backdropBlur: { '2xl': '40px' },
      boxShadow: {
        'glow-early': '0 0 60px -10px rgba(255,59,48,0.45)',
        'glow-progress': '0 0 60px -10px rgba(191,90,242,0.45)',
        'glow-freedom': '0 0 60px -10px rgba(255,215,0,0.45)'
      },
      keyframes: {
        breathe: {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.18)' }
        },
        flicker: {
          '0%,100%': { opacity: 1 },
          '50%': { opacity: 0.7 }
        }
      },
      animation: {
        breathe: 'breathe 5.5s ease-in-out infinite',
        flicker: 'flicker 2.2s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
