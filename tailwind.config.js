/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        hand: ['"Caveat"', '"Kalam"', "cursive"],
        serif: ['"Libre Caslon Text"', '"Georgia"', "serif"],
      },
      colors: {
        paper: "#f5ecd7",
        paperDark: "#e9dcb6",
        ink: "#2a1f14",
        leather: "#6b2a1a",
        leatherDark: "#491912",
        gold: "#c9a04a",
        ruled: "#8faec6",
      },
      boxShadow: {
        book: "0 30px 60px -20px rgba(0,0,0,0.55), 0 18px 30px -15px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
