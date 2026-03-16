/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 300:'#a5bbff', 400:'#8097ff', 500:'#6271ff', 600:'#4a4ff5', 700:'#3d3ddf', 800:'#3234b4', 900:'#1c1e55' },
        surface: { DEFAULT:'#0a0a14', 100:'#0e0e1e', 200:'#13132b', 300:'#1a1a38' },
      },
      backgroundImage: { 'grid-pattern': "linear-gradient(to right, rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.1) 1px, transparent 1px)" },
    },
  },
  plugins: [],
};
