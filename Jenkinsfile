import groovy.json.JsonBuilder

@Library('pipeline-library') _

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
                      "v${version}",
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
                      'patch'
                    )
                }
            }
        } // isMain()

    } // onSuccess
} // end

// onSuccess = {
//       sh("""
//         echo "=== root folder ==="
//         ls -als ./

//         echo "=== Printing manifest.json ==="
//         cat ./manifest.json

//         echo "=== Printing package.json ==="
//         cat ./package.json

//         echo "=== dist folder ==="
//         ls -als dist/

//         echo "=== Printing dist/deploy-info.json ==="
//         cat ./dist/deploy-info.json

//         # echo "=== Printing dist/package.json ==="
//         # cat ./dist/package.json

//         echo "=== Printing params ==="
//         echo "ENVIRONMENT  : ${env.ENVIRONMENT}"
//         echo "BUILD_NUMBER : ${env.BUILD_NUMBER}"
//         echo "BUILD_ID     : ${env.BUILD_ID}"
//         echo "BRANCH_NAME  : ${env.BRANCH_NAME}"
//         echo "APP_NAME     : ${env.APP_NAME}"
//         echo "VERSION      : ${env.VERSION}"
//       """)

//       def packageJsonPath = "./package.json"
//       def tag = ""

//       // save a copy of the original package.json
//       sh("cp ${packageJsonPath} ${packageJsonPath}.orig")

//       // if not MAIN branch, then we need to adjust the verion in the package.json
//       if (!isMain()) {
//         // TODO: find out how to get this from the pipeline

//         // load the package.json version
//         def packageJson = readJSON(file: packageJsonPath)
//         def featureBranch = env.BRANCH_NAME

//         // all feature branches default to --alpha
//         tag = "--tag alpha"

//         if (isRelease()) {
//           tag = "--tag next"
//           featureBranch = "release"
//         }

//         if (isDevelop()) {
//           tag = "--tag beta"
//           featureBranch = "develop"
//         }

//         packageJson.version = "${packageJson.version}-${featureBranch}.${env.BUILD_NUMBER}".toString()
//         println("Writing package.json version to: ${packageJson.version}")

//         writeFile(text: new JsonBuilder(packageJson).toPrettyString(), file: './package.json')
//       }

//       withCredentials([string(credentialsId: constants.credentials.npm, variable: 'token')]) {
//           sh("""
//               rm -f ~/.npmrc
//               echo "ca=null" > ~/.npmrc
//               echo "//registry.npmjs.org/:_authToken=${token}" >> ~/.npmrc

//               cat ./package.json
//               npm publish ${tag} # --dry-run

//               # move original package.json back
//               cp ${packageJsonPath}.orig ${packageJsonPath}
//           """)
//       }

//       // tag, back merge, and prep the next patch verion
//       if (isMain()) {
//         // tag
//         def commitSha = sh(script: "git log -1 --format='%H'", returnStdout: true).trim()
//         def version = "v${env.VERSION}" // for MAINLINE builds, this will always be the semver in package.json

//         sh("""
//           git tag ${version} ${commitSha}
//           git push origin --tags

//           git checkout ${MAIN_BRANCH}
//           npm install --no-save semver@7
//         """)

//         // merge back into develop and prep next patch version

//         def CURRENT_VERSION = sh(script: "node -e \"console.log(require('./package.json').version)\"", returnStdout: true).trim()
//         def NEXT_VERSION = sh(script: "node -e \"console.log(require('semver').inc('${CURRENT_VERSION}', 'patch'))\"", returnStdout: true).trim()

//         sh("""
//           printf "Merging ${MAIN_BRANCH} to ${DEVELOP_BRANCH}..\n"
//           git checkout ${DEVELOP_BRANCH}
//           git pull --ff-only
//           if ! git merge ${MAIN_BRANCH} ; then
//               printf "Merging ${MAIN_BRANCH} to ${DEVELOP_BRANCH} failed!\nPlease resolve merge conflicts manually."
//               exit 2 # unstable
//           else
//               printf "${MAIN_BRANCH} was successfully merged to ${DEVELOP_BRANCH}"
//           fi

//           printf "Setting package.json version..."
//           npm --no-git-tag-version version ${NEXT_VERSION}
//           printf "Comitting version bump..."
//           git add package.json
//           git commit -m "Prep v${NEXT_VERSION} and merging ${MAIN_BRANCH} back into ${DEVELOP_BRANCH}"

//           git push --no-verify --verbose origin ${DEVELOP_BRANCH}:${DEVELOP_BRANCH}
//         """)
//       }
//     }