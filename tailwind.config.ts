import type { Config } from "tailwindcss";

// Koda brand palette (Press Kit):
//   Navy        #11327A
//   Teal        #34B3D4
//   Teal-light  #CCECF4
//   Coral       #EE8363
//   Green       #4BAC64
//   Gray        #5D6265
//
// Strategy: rebrand Tailwind's `indigo` palette to map onto Koda navy + teal
// so every existing `bg-indigo-600`, `text-indigo-700`, etc. inherits the
// brand without a refactor pass. New code can use the explicit `koda-*`
// utilities below.

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-montserrat)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        koda: {
          navy: "#11327A",
          "navy-50": "#E7EBF4",
          "navy-100": "#C2CCE3",
          "navy-200": "#8E9EC9",
          "navy-700": "#11327A",
          "navy-800": "#0E2A66",
          "navy-900": "#0A1E4D",
          teal: "#34B3D4",
          "teal-light": "#CCECF4",
          "teal-50": "#F2FAFC",
          "teal-100": "#CCECF4",
          "teal-200": "#A8DDEC",
          "teal-300": "#7DCAE0",
          "teal-400": "#5DBED7",
          "teal-500": "#34B3D4",
          "teal-600": "#2A8FAA",
          coral: "#EE8363",
          "coral-50": "#FDF1EC",
          "coral-100": "#FBDDD0",
          "coral-700": "#C95E3F",
          green: "#4BAC64",
          "green-50": "#EDF7EF",
          "green-100": "#CBE8D2",
          "green-700": "#3A8E50",
          gray: "#5D6265",
        },
        // Rebrand indigo to Koda navy/teal so existing class references
        // pick up the brand automatically.
        indigo: {
          50: "#F2FAFC",
          100: "#CCECF4",
          200: "#A8DDEC",
          300: "#7DCAE0",
          400: "#5DBED7",
          500: "#34B3D4",
          600: "#2A8FAA",
          700: "#11327A",
          800: "#0E2A66",
          900: "#0A1E4D",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(15 23 42 / 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
