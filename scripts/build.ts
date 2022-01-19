import { execSync as Child } from 'child_process';
import FS from 'fs';

const { files, outDir } = require('../webpack.config');
const { version } = require('../package.json');

function fileReplace (fileName: string, placeholder: string, value: string) {
  const originalFile = FS.readFileSync(fileName).toString();
  FS.writeFileSync(fileName, originalFile.replace(placeholder, value));
}

// "build": "npm run clean && npm run build:es && npm run build:cjs && npm run build:cdn",
Child('npm run clean');
Child('npm run build:es');
Child('npm run build:cjs');
Child('npm run build:cdn');

// copy version
const filesToInjectVersion = [
  'es/logger.d.ts',
  'es/logger.js',
  'src/logger.d.ts',
  'src/logger.js',
]
  .concat(Object.values(files))
  .map(file => `${outDir}/${file}`);

console.log('Files to inject version into', { filesToInjectVersion, version });
filesToInjectVersion.forEach(file => {
  fileReplace(file, '__GENESYS_CLOUD_CLIENT_LOGGER_VERSION__', version);
  console.log(`  Replaced version (${version}) in "${file}"`);
});

// copy cdn files and manifest
require('./build-cdn-with-manifest');