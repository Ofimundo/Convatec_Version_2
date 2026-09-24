/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ofilab: {
          pink: "#E53987",
          magenta: "#D9267C",
          purple: "#7B2CBF",
          violet: "#9333EA",
          dark: "#0B0F19",
          card: "#131927",
          border: "rgba(229, 57, 135, 0.15)",
        }
      },
      backgroundImage: {
        'ofilab-gradient': 'linear-gradient(135deg, #E53987 0%, #7B2CBF 100%)',
        'ofilab-radial': 'radial-gradient(circle at top right, rgba(229, 57, 135, 0.15), rgba(123, 44, 191, 0.05), transparent 70%)',
      }
    },
  },
  plugins: [],
}
