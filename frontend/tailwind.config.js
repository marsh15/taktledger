/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        panel: "#F7F8F5",
        line: "#D9DED3",
        steel: "#52606D",
        signal: "#0E7C66",
        amber: "#B7791F",
        danger: "#C2413A"
      }
    }
  },
  plugins: []
};
