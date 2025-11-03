/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-red': '#E9473C',
        'section-blue': '#2D74BA',
        'section-green': '#69BD93',
        'section-yellow': '#F2BE69',
        'section-red': '#E9473C',
      },
      fontFamily: {
        'ginka': ['Ginka', 'sans-serif'],
      },
      fontSize: {
        'charte-h1': ['70px', { lineHeight: '70px', fontWeight: '700' }],
        'charte-h2': ['56px', { lineHeight: '56px', fontWeight: '700' }],
        'charte-h3': ['40px', { lineHeight: '40px', fontWeight: '700' }],
        'charte-h4': ['30px', { lineHeight: '30px', fontWeight: '700' }],
        'charte-h5': ['24px', { lineHeight: '30px', fontWeight: '400' }],
        'charte-h6': ['21px', { lineHeight: '24px', fontWeight: '400' }],
        'charte-p': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'charte-btn': ['24px', { lineHeight: '30px', fontWeight: '700' }],
      },
      borderRadius: {
        'charte-media': '10px',
      },
    },
  },
  plugins: [],
} 