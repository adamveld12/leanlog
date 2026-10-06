module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Bundles drizzle's generated .sql migrations into migrations.js.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
