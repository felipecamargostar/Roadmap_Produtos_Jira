import type { Config } from "tailwindcss";

// Tokens da identidade visual Starbem.
// Duas cores, dois papéis: laranja #FF5100 e a marca (principal), roxo #7F56D9 e
// o acento secundario de UI. Texto e chrome usam a escala ink (Untitled UI).
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Funnel Display", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      colors: {
        // Principal — laranja Starbem
        brand: {
          50: "#fff1e0",
          100: "#ffe0be",
          200: "#ffc992",
          300: "#ff9353",
          500: "#ff5100",
          600: "#d03700",
          700: "#a31b00",
          900: "#900700",
        },
        // Secundario — roxo de produto
        secondary: {
          50: "#f3e9fc",
          200: "#d1b4f6",
          300: "#ae8ef1",
          500: "#7f56d9",
          600: "#5a40b5",
          700: "#461fae",
          900: "#18176b",
        },
        // Neutros frios para texto, bordas e superficies
        ink: {
          50: "#f9fafb",
          100: "#f2f4f7",
          200: "#eaecf0",
          300: "#d0d5dd",
          500: "#667085",
          600: "#475467",
          700: "#344054",
          900: "#101828",
        },
      },
      boxShadow: {
        header: "0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
