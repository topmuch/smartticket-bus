/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0f4c75',
        accent: '#00b894',
        warning: '#f39c12',
        danger: '#e74c3c',
      },
    },
  },
  plugins: [],
};
