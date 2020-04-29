const path = require('path');

module.exports = (env) => {
  const minimize = env && env.production;
  const filename = `genesys-cloud-client-logger${minimize ? '.min' : ''}.js`;
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
      path: path.resolve(__dirname, 'dist'),
      filename,
      library: 'GenesysCloudClientLogger',
      libraryTarget: 'umd'
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
