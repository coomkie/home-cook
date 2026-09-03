const path = require('path');

/**
 * Nest monorepo defaults output to dist/<project.root>
 * (e.g. dist/apps/backend/user-service), but `nest start`
 * looks for dist/apps/<project-name>. Force the latter.
 */
module.exports = function (options) {
  options.output = {
    ...options.output,
    path: path.join(process.cwd(), 'dist/apps/user-service'),
    filename: 'main.js',
  };
  return options;
};
