/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["ui-monospace", "'Cascadia Code'", "'SF Mono'", "monospace"],
      },
      colors: {
        navy: {
          950: "#050810",
          900: "#080C14",
          800: "#0F1623",
          700: "#162030",
          600: "#1E2D42",
          500: "#253550",
        },
      },
    },
  },
  plugins: [],
};
