const path = require('path');

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
      minimize
    },
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, outDir),
      filename,
      library: 'GenesysCloudClientLogger',
      libraryTarget: 'umd',
      libraryExport: 'default'
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