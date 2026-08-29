/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        achar: {
          50: '#fff8ed',
          100: '#ffefd2',
          500: '#b45309',
          700: '#8b2e2e',
          900: '#4b1d1d'
        }
      }
    }
  },
  plugins: []
};
