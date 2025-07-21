const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const files = {
  filename: 'genesys-cloud-client-logger.js',
  filenameMap: 'genesys-cloud-client-logger.js.map',
  filenameMin: 'genesys-cloud-client-logger.min.js',
  filenameMinMap: 'genesys-cloud-client-logger.min.js.map'
};

const outDir = 'dist'

module.exports = (env) => {
  const minimize = env && env.production;
  const filename = minimize ? files.filenameMin : files.filename;
  const mode = minimize ? 'production' : 'development';

  console.log(`build mode: ${mode}`);

  return {
    target: 'web',
    entry: './src/index.ts',
    mode,
    optimization: {
      minimize,
      minimizer: minimize ? [
        new TerserPlugin({
          sourceMap: true,
          terserOptions: {
            compress: {
              drop_console: false,
            },
          },
          extractComments: false,
        })
      ] : undefined
    },
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, outDir),
      filename,
      library: 'GenesysCloudClientLogger',
      libraryTarget: 'umd',
      libraryExport: 'default',
      hashFunction: 'sha256'
    },
    resolve: {
      extensions: ['.ts', '.js', '.json']
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          loader: 'babel-loader',
          query: {
            presets: ['@babel/preset-env']
          }
        },
        {
          test: /\.ts$/,
          exclude: /(node_modules|bower_components)/,
          loader: 'ts-loader'
        }
      ]
    }
  };
};

module.exports.files = files;
module.exports.outDir = outDir;