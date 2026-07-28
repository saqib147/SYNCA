/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#16191e',
          card: '#1e232b',
          hover: '#252b35',
        },
        contentBg: '#f4f4f5',
        surface: '#ffffff',
        accent: {
          lime: '#d8f870',
          limeHover: '#c4ea48',
          mint: '#8be6c1',
          teal: '#2ecc8f',
        },
        sticky: {
          yellow: '#fde896',
          pink: '#f9c5d1',
          mint: '#8be6c1',
        },
        status: {
          onTrack: '#10b981',
          activeSprint: '#3b82f6',
          atRisk: '#f59e0b',
          blocked: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'Inter', 'sans-serif'],
        display: ['var(--font-funnel)', 'Funnel Display', 'Outfit', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
