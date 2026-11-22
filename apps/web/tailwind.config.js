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
          DEFAULT: '#17181c',
          card: '#1e2127',
          hover: '#252932',
        },
        contentBg: '#f3f3f3',
        surface: '#ffffff',
        accent: {
          lime: '#F0FF7C',
          limeHover: '#e3f562',
          mint: '#66deb4',
          teal: '#006c52',
        },
        figma: {
          dark: '#17181c',
          light: '#f3f3f3',
          yellow: '#F0FF7C',
          teal: '#66deb4',
          darkTeal: '#006c52',
          greyGrad: '#6F7384',
        },
        sticky: {
          yellow: '#F0FF7C',
          pink: '#f9c5d1',
          mint: '#66deb4',
        },
        status: {
          onTrack: '#66deb4',
          activeSprint: '#3b82f6',
          atRisk: '#f59e0b',
          blocked: '#ba1a1a',
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
