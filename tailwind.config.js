/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors: {
      "black": "#121212",
      "white": "#f0f0f0",
      "orange": "#FF6700",
    },
    extend: {
      fontFamily: {
        FinalFrontier: "FinalFrontier",
        Icons: "Icons",
      }
    },
  },
  plugins: [],
}
