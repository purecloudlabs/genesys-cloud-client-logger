@Library('pipeline-library') _
env.NPM_CONFIG_USERCONFIG = '/var/build/npmrc-nexus'

def MAIN_BRANCH = 'master'
def DEVELOP_BRANCH = 'develop'
def isBitbucket = false

def isMain = {
  env.BRANCH_NAME == MAIN_BRANCH
}

def isRelease = {
  env.BRANCH_NAME.startsWith('release/')
}

def isDevelop = {
  env.BRANCH_NAME == DEVELOP_BRANCH
}

def gitFunctions = new com.genesys.jenkins.Git()
def npmFunctions = new com.genesys.jenkins.Npm()

webappPipelineV2 {
  projectName = 'genesys-cloud-client-logger'
  team = 'Client Streaming and Signaling'
  jiraProjectKey = 'STREAM'
  urlPrefix = 'genesys-cloud-client-logger'
  nodeVersion = '20.x multiarch'
  mailer = 'GcMediaStreamSignal@genesys.com'
  chatGroupId = 'adhoc-60e40c95-3d9c-458e-a48e-ca4b29cf486d'
  manifest = customManifest('./dist') {
      readJSON(file: 'dist/manifest.json')
  }
  ciTests = {
    sh('''
      npm ci
      npm run test
    ''')
  }

  buildStep = { assetPrefix ->
    sh('''
      npm --versions
    ''')
    sh("npm run build:prod -- --base-href='${assetPrefix}'")
  }

  onSuccess = {
    sh("""
      echo "=== root folder ==="
      ls -als ./

      echo "=== Printing manifest.json ==="
      cat ./manifest.json || true

      echo "=== Printing package.json ==="
      cat ./package.json

      echo "=== dist folder ==="
      ls -als dist/

      echo "=== Printing dist/deploy-info.json ==="
      cat ./dist/deploy-info.json || true
    """)

    def packageJsonPath = './package.json'
    def packageJson = readJSON(file: packageJsonPath)
    def tag = 'alpha'
    def version = env.VERSION

    if (!isMain()) {
      def featureBranch = env.BRANCH_NAME

      if (isRelease()) {
        tag = 'next'
        featureBranch = 'release'
      } else if (isDevelop()) {
        tag = 'beta'
        featureBranch = 'develop'
      }

      version = "${packageJson.version}-${featureBranch}.${env.BUILD_NUMBER}"
    }

    stage('Publish to NPM') {
      script {
        npmFunctions.publishNpmPackage([
          tag: tag,
          useArtifactoryRepo: false,
          version: version,
          dryRun: false
        ])
      }
    }

    if (isMain()) {
      stage('Tag commit and merge main branch back into develop branch') {
        script {
          gitFunctions.tagCommit("v${version}", gitFunctions.getCurrentCommit(), isBitbucket)
          gitFunctions.mergeBackAndPrep(MAIN_BRANCH, DEVELOP_BRANCH, 'patch', isBitbucket)
        }
      }
    }
  }

  snykConfig = {
    return [
      organization: 'genesys-client-media-webrtc',
      wait: true
    ]
  }
}