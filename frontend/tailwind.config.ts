import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        white: '#FFFFFF',
        zinc: {
          800: '#333333',
          900: '#1A1A1A',
          400: '#CCCCCC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'SF Mono', 'monospace'],
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      },
    },
  },
  plugins: [],
};

export default config;
