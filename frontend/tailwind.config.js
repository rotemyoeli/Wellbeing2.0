/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Spec v2 §11 — soft colours, no alarming red on the employee screen.
        // Sprint 3 finalises the design system; these are starter tokens.
        brand: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          900: '#0C4A6E',
        },
        ink: {
          900: '#0F172A',
          700: '#334155',
          500: '#64748B',
          300: '#CBD5E1',
        },
      },
      fontSize: {
        // Spec v2 §11 — font >=16px on employee screen.
        base: ['16px', '24px'],
      },
      borderRadius: {
        battery: '24px',
      },
    },
  },
  plugins: [],
}
