/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
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
          lime: '#F0FF7C',
          limeHover: '#d8f870',
          mint: '#79DEBA',
          teal: '#006565',
        },
        figma: {
          dark: '#17181C',
          light: '#F3F3F3',
          yellow: '#F0FF7C',
          teal: '#79DEBA',
          darkTeal: '#006565',
          greyGrad: '#6F7384',
        },
        sticky: {
          yellow: '#F0FF7C',
          pink: '#f9c5d1',
          mint: '#79DEBA',
        },
        status: {
          onTrack: '#79DEBA',
          activeSprint: '#3b82f6',
          atRisk: '#f59e0b',
          blocked: '#ef4444',
        },
      },
      backgroundImage: {
        'figma-dark-grad': 'linear-gradient(180deg, #17181C 0%, #6F7384 100%)',
        'figma-light-grad': 'linear-gradient(180deg, #F3F3F3 0%, #E0E0E0 100%)',
        'figma-yellow-grad': 'linear-gradient(180deg, #F0FF7C 0%, #FAFFD6 100%)',
        'figma-teal-grad': 'linear-gradient(180deg, #79DEBA 0%, #B8FFE6 100%)',
        'figma-dark-teal-grad': 'linear-gradient(180deg, #006565 0%, #79DEBA 100%)',
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'sans-serif'],
        display: ['Funnel Display', 'DM Sans', 'sans-serif'],
        funnel: ['Funnel Display', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        'figma': '43px',
      },
    },
  },
  plugins: [],
};
