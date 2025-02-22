const {buildOptimizer} = require('@angular-devkit/build-optimizer/src/build-optimizer/build-optimizer');
const node = require('rollup-plugin-node-resolve');

const buildOptimizerPlugin = {
  name: 'build-optimizer',
  transform: (content, id) => {
    const {content: code, sourceMap: map} = buildOptimizer({
      content,
      inputFilePath: id,
      emitSourceMap: true,
      // Always assume side-effect free source files, except for the autogenerated
      // module index file. The bootstrap module call should not be eliminated.
      isSideEffectFree: !id.endsWith('_autogenerated_module_index.mjs'),
      isAngularCoreFile: false,
    });
    if (!code) {
      return null;
    }
    if (!map) {
      throw new Error('No sourcemap produced by build optimizer');
    }
    return {code, map};
  },
};

module.exports = {
  plugins: [
    buildOptimizerPlugin,
    node({
      mainFields: ['es2020', 'module'],
    }),
  ],
};
