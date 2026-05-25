/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        funato: {
          green: '#2d6a2d',
          'green-light': '#4a9e4a',
          'green-dark': '#1a4a1a',
          brown: '#5c3317',
          'brown-dark': '#3d2010',
          gold: '#c8a951',
          cream: '#f5f0e8',
        },
        brand: {
          50: '#f0fdf0',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
      fontFamily: {
        lexend: ['Lexend', 'sans-serif'],
        'ocr-a': ['"OCR A Std"', '"OCR A BT"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'card': '0 4px 24px -2px rgba(0,0,0,0.12)',
        'card-hover': '0 8px 32px -4px rgba(0,0,0,0.18)',
        'id-card': '0 8px 48px -4px rgba(0,0,0,0.3)',
      },
      backgroundImage: {
        'funato-gradient': 'linear-gradient(135deg, #2d6a2d 0%, #4a9e4a 50%, #2d6a2d 100%)',
        'dashboard-bg': 'linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)',
      },
      screens: {
        'print': { raw: 'print' },
      },
    },
  },
  plugins: [],
};
