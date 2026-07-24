// CRACO configuration to enable Tailwind CSS in Create React App
// without ejecting. This overrides the default PostCSS config.
module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
};
