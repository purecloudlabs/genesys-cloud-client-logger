import { execSync as Child } from 'child_process';
import FS from 'fs';

const { files, outDir } = require('../webpack.config');
const { version, name } = require('../package.json');

const majorVersion = `v${version.split('.')[0]}`;
const exactVersion = `v${version}`;

// Function to get current git branch
function getCurrentGitBranch(): string {
  try {
    return Child('git branch --show-current', { encoding: 'utf8' }).toString().trim();
  } catch (error) {
    console.warn('Could not determine git branch:', error);
    return 'unknown';
  }
}

const VERSION = process.env.VERSION || version;
const APP_NAME = process.env.APP_NAME || name;
const BRANCH_NAME = process.env.BRANCH_NAME || getCurrentGitBranch();

console.log({ majorVersion, exactVersion, files, outDir, VERSION, APP_NAME, BRANCH_NAME });

/* create folders */
function makeDir (path: string) {
  if (!FS.existsSync(path)) {
    FS.mkdirSync(path, { recursive: true });
  }
}

function copyFile (from: string, to: string) {
  Child(`cp ${from} ${to}`);
  console.log('Copied file', { fromFile: from, __toFile: to });
}

makeDir(`${outDir}/${majorVersion}`)
makeDir(`${outDir}/${exactVersion}`)

const indexFiles: string[] = [];

/* copy files to version folders */
Object.values(files).forEach(file => {
  const majorFile = `${majorVersion}/${file}`;
  const exactFile = `${exactVersion}/${file}`;

  indexFiles.push(`${majorFile}`);
  indexFiles.push(`${exactFile}`);

  copyFile(`${outDir}/${file}`, `${outDir}/${majorFile}`);
  copyFile(`${outDir}/${file}`, `${outDir}/${exactFile}`);
});

/* create and write manifest */
const manifestPath = `${outDir}/manifest.json`;
const manifest = {
  name: APP_NAME,
  version: VERSION,
  indexFiles: indexFiles.sort().reverse().map(file => ({ file })),
  buildMetadata: {
    git: {
      branch: BRANCH_NAME
    }
  }
};

FS.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { encoding: 'utf8' });
console.log(`Wrote ${manifestPath}:`, manifest);