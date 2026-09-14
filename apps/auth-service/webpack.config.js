const { composePlugins, withNx } = require('@nx/webpack');
const { join } = require('path');

// Nx plugins for webpack.
module.exports = composePlugins(
  withNx({
    target: 'node',
  }),
  (config) => {
    config.output = {
      ...config.output,
      ...(process.env.NODE_ENV !== 'production' && {
        clean: true,
        devtoolModuleFilenameTemplate: '[absolute-resource-path]',
      }),
    };
    config.devtool = 'source-map';
    // The generated Prisma client isn't a real workspace package (no
    // node_modules symlink) - it's only reachable via the tsconfig.app.json
    // path mapping (see that file's paths entry, and the matching
    // moduleNameMapper in jest.config.cts). Webpack's resolver doesn't read
    // tsconfig paths, so it needs the same mapping spelled out here too.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@ecommerce/prisma-client-auth': join(
        __dirname,
        '../../libs/prisma-client-auth/src/generated'
      ),
    };
    return config;
  },
);
