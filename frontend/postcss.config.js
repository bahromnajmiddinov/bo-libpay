// Use explicit requires so PostCSS receives plugin functions (avoids string->resolution issues)
module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
};
  