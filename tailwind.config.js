/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          100: '#F3E8E6',
          900: '#3A2E2B', // Approx from logo
        },
        female: '#EC4899', // Pink for female therapist
        male: '#3B82F6', // Blue for male therapist
        status: {
          confirmed: '#3B82F6', // Blue
          inProgress: '#EC4899', // Pink
          cancelled: '#9CA3AF', // Grey
        }
      }
    },
  },
  plugins: [],
}
