/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        titan: {
          black: '#09090B',
          obsidian: '#121215',
          surface: '#18181B',
          border: '#27272A',
          subtle: '#3F3F46',
          muted: '#71717A',
          silver: '#A1A1AA',
          light: '#F4F4F5',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-white': '0 0 25px rgba(255, 255, 255, 0.12)',
        'glow-subtle': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
