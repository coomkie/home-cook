const path = require('path');

module.exports = function (options) {
  options.output = {
    ...options.output,
    path: path.join(process.cwd(), 'dist/apps/api-gateway'),
    filename: 'main.js',
  };
  return options;
};
