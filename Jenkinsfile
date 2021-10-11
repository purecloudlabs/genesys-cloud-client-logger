@Library('pipeline-library') _

webappPipeline {
    slaveLabel = 'dev_v2'
    useArtifactoryRepo = false
    projectName = 'genesys-cloud-client-logger'
    manifest = directoryManifest('dist')
    buildType = { (env.BRANCH_NAME == 'master' || env.BRANCH_NAME.startsWith('release/')) ? 'MAINLINE' : 'FEATURE' }
    publishPackage = { 'prod' }

    buildStep = {
        sh("""
          npm install npm@7 -g && \
          npm ci && \
          npm test && \
          npm run build
        """)
    }

    cmConfig = {
        return [
            managerEmail: 'purecloud-client-media@genesys.com',
            rollbackPlan: 'Patch version with fix',
            qaId: '5d41d9195ca9700dac0ef53a'
        ]
    }

    shouldTagOnRelease = { true }
}
