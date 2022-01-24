import groovy.json.JsonBuilder

@Library('pipeline-library@COMUI-857') _

def MAIN_BRANCH = 'fake-main'
def DEVELOP_BRANCH = 'fake-develop'

def isMain = {
  env.BRANCH_NAME == MAIN_BRANCH
}

def isRelease = {
  env.BRANCH_NAME.startsWith('release/')
}

def isDevelop = {
  env.BRANCH_NAME == DEVELOP_BRANCH
}

def getBuildType = {
  isMain()
    ? 'MAINLINE'
    : 'FEATURE'
}

webappPipeline {
    projectName = 'genesys-cloud-client-logger'
    team = 'Genesys Client Media (WebRTC)'
    mailer = 'purecloud-client-media@genesys.com'
    chatGroupId = '763fcc91-e530-4ed7-b318-03f525a077f6'

    nodeVersion = '14.x'
    buildType = getBuildType
    manifest = customManifest('./dist') {
        readJSON(file: 'dist/manifest.json')
    }

    testJob = 'no-tests'

    ciTests = {
      sh("""
        npm i -g npm@7
        npm ci
        npm run test
      """)
    }

    buildStep = {cdnUrl ->
        sh("""
            echo 'CDN_URL ${cdnUrl}'
            npm --versions
            npm run build
        """)
    }

    deployConfig = [
      dev : 'always',
      test : 'always',
      prod : 'always',
      'fedramp-use2-core': 'always'
    ]

      onSuccess = {
        sh("""
          echo "=== root folder ==="
          ls -als ./

          echo "=== Printing manifest.json ==="
          cat ./manifest.json

          echo "=== Printing package.json ==="
          cat ./package.json

          echo "=== dist folder ==="
          ls -als dist/

          echo "=== Printing dist/deploy-info.json ==="
          cat ./dist/deploy-info.json

          # echo "=== Printing dist/package.json ==="
          # cat ./dist/package.json
        """)

        println("=== Printing params ===")
        println("ENVIRONMENT  : ${env.ENVIRONMENT}")
        println("BUILD_NUMBER : ${env.BUILD_NUMBER}")
        println("BUILD_ID     : ${env.BUILD_ID}")
        println("BRANCH_NAME  : ${env.BRANCH_NAME}")
        println("APP_NAME     : ${env.APP_NAME}")
        println("VERSION      : ${env.VERSION}")

        def packageJsonPath = "./package.json"
        def tag = "" // TODO: change back to empty string
        def version = env.VERSION

        // save a copy of the original package.json
        // sh("cp ${packageJsonPath} ${packageJsonPath}.orig")

        // if not MAIN branch, then we need to adjust the verion in the package.json
        if (!isMain()) {
          // TODO: find out how to get this from the pipeline

          // load the package.json version
          def packageJson = readJSON(file: packageJsonPath)
          def featureBranch = env.BRANCH_NAME

          // all feature branches default to --alpha
          tag = "alpha"

          if (isRelease()) {
            tag = "next"
            featureBranch = "release"
          }

          if (isDevelop()) {
            tag = "beta"
            featureBranch = "develop"
          }

          version = "${packageJson.version}-${featureBranch}.${env.BUILD_NUMBER}".toString()
          // println("Writing package.json version to: ${packageJson.version}")

          // writeFile(text: new JsonBuilder(packageJson).toPrettyString(), file: './package.json')
        }

        def npmFunctions = null
        def gitFunctions = null
        def pwd = pwd()

        stage('Download npm & git utils') {
            script {
              // clone pipelines repo
                dir('pipelines') {
                    git branch: 'COMUI-857',
                        url: 'git@bitbucket.org:inindca/pipeline-library.git',
                        changelog: false

                    npmFunctions = load 'src/com/genesys/jenkins/Npm.groovy'
                    gitFunctions = load 'src/com/genesys/jenkins/Git.groovy'
                }
            }
        }

        stage('Publish to NPM and tag commit') {
            script {
                dir(pwd) {
                    npmFunctions.publishNpmPackage([
                        tag: tag, // optional
                        useArtifactoryRepo: false, // optional, default `true`
                        version: version, // optional, default is version in package.json
                        dryRun: true // dry run the publish, default `false`
                    ])

                    gitFunctions.tagCommit(
                      "v${version}-${env.BUILD_NUMBER}-testing",
                      gitFunctions.getCurrentCommit(),
                      false
                    )
                }
            }
        }

        if (isMain()) {
            stage('Merge main branch back into develop branch') {
                script {
                    gitFunctions.mergeBackAndPrep(
                      MAIN_BRANCH,
                      DEVELOP_BRANCH,
                      'patch',
                      false
                    )
                }
            }
        } // isMain()

    } // onSuccess
} // end