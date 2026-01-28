/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bloop UI color scheme
        bg: "#1e1e1e",           // Main background
        panel: "#252526",        // Sidebar background
        'panel-hover': "#2a2d2e", // Sidebar hover
        editor: "#1e1e1e",       // Editor background
        border: "#3e3e42",       // Borders
        'border-light': "#454545",
        text: "#cccccc",         // Primary text
        muted: "#858585",         // Muted text
        'muted-light': "#a0a0a0",
        accent: "#007acc",        // Accent blue
        'accent-hover': "#1a8cd8",
        tab: "#2d2d30",          // Tab background
        'tab-active': "#1e1e1e",  // Active tab
        'tab-border': "#007acc",  // Active tab border
      },
      fontFamily: {
        'mono': ['Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
        'sans': ['Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
