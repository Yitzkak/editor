module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        monox: ['Source Code Pro', 'monospace']
      },
    },
    fontFamily: {
      // Apply Poppins globally
      sans: ['Poppins', 'sans-serif'], // Default font for all elements
    },
  },
  plugins: [],
}
