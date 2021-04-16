@Library('pipeline-library') _

webappPipeline {
    slaveLabel = 'dev_v2'
    nodeVersion = '14.8.0'
    useArtifactoryRepo = false
    projectName = 'genesys-cloud-client-logger'
    manifest = directoryManifest('dist')
    buildType = { (env.BRANCH_NAME == 'master' || env.BRANCH_NAME.startsWith('release/')) ? 'MAINLINE' : 'FEATURE' }
    publishPackage = { 'prod' }

    buildStep = {
        sh('npm ci && npm test && npm run build')
    }

    cmConfig = {
        return [
            managerEmail: 'purecloud-client-media@genesys.com',
            rollbackPlan: 'Patch version with fix',
        ]
    }

    shouldTagOnRelease = { true }
}
