#!groovy

// Define DevCloud Artifactory for publishing non-docker image artifacts
def artUploadServer = Artifactory.server('devcloud')

// Change Snapshot to your own DevCloud Artifactory repo name
def Repository = 'IEWMR-SNAPSHOT'

def appName = 'ge-ui-app'

pipeline {
    agent none
    options {
        buildDiscarder(logRotator(artifactNumToKeepStr: '20', numToKeepStr: '20'))
    }
    parameters {
        choice(
            choices: 'snapshot\nrelease',
            description: 'Build mode?',
            name: 'BUILD_MODE')
        string(name: 'DEPLOY_URL', defaultValue: 'https://propel.ci.build.ge.com', description: '')
        string(name: 'DEPLOY_ENV', defaultValue: 'predix-cf1', description: 'Predix US West by default')
        string(name: 'CF_Org', defaultValue: 'European_Foundry_Basic', description: 'Predix orgs')
        string(name: 'CF_Space', defaultValue: 'demos-dev', description: 'Predix space')
    }
    stages {

        stage ('Clean workspace') {
            agent {
                docker {
                    image 'alpine'
                    label 'dind'
                }
            }
            steps {
                deleteDir()
            }
        }

        stage ('Build') {
            agent {
                docker {
                    image 'node:8'
                    label 'dind'
                }
            }
            environment {
                CACHING_REPO_URL = 'https://repo.ci.build.ge.com/artifactory/api/npm/npm-virtual/'
            }
            steps {
                sh 'npm config set strict-ssl false'
                sh 'npm config set registry $CACHING_REPO_URL'
                sh 'yarn global add bower'
                sh 'yarn global add gulp-cli'
                sh 'yarn install'
                sh 'bower --allow-root install'
                sh 'ls -la'
                script {
                    appName = sh (
                        script: "basename `git remote show -n origin | grep Fetch | cut -d: -f2- | sed 's/\\.git//g'`",
                        returnStdout: true
                    ).trim()
                    env.ci_build_appname = appName
                    env.ci_build_number = env.BUILD_NUMBER
                    if (params.BUILD_MODE == 'release' || env.BRANCH_NAME.startsWith('release')) {
                        env.ci_build_mode = 'RELEASE'
                        Repository = 'IEWMR'
                    } else {
                        env.ci_build_mode = 'SNAPSHOT'
                    }
                    env.ci_build_tag = sh (
                        script: "git describe --tags",
                        returnStdout: true
                    ).trim()
                }

                sh 'gulp dist'
                sh 'gulp dist:archive'
                stash includes: '*.zip', name: 'artifact'
                stash includes: 'manifest-*.yml', name: 'manifest'
            }
            post {
                success {
                    echo 'Build stage completed'
                }
                failure {
                    echo 'Build stage failed'
                }
            }
        }

        stage('Unit Tests') {
            agent {
                docker {
                    image 'node:8'
                    label 'dind'
                }
            }
            steps {
                sh 'yarn test-node'
            }
            post {
                success {
                    echo 'Test stage completed'
                }
                failure {
                    echo 'Test stage failed'
                }
            }
        }

        /* TODO: You should uncomment this section for continuous deployment
        stage ('PCD Deploy') {
            agent {
                docker {
                    image 'repo.ci.build.ge.com:8443/pcd'
                    label 'dind'
                }
            }
            environment {
                CLOUD_FOUNDRY = credentials('Deployment_Credential')
                DEPLOY_TOKEN = credentials('CD_Token')
            }
            when {
                branch 'master'
            }
            steps {
                unstash 'artifact'
                unstash 'manifest'

                sh "pcd deploy auth -a ${params.DEPLOY_URL} --tid $DEPLOY_TOKEN_PSW -u $CLOUD_FOUNDRY_USR -o ${params.CF_Org} -s ${params.CF_Space} -e ${params.DEPLOY_ENV}"

                sh "pcd deploy --hn ${appName}-dev -a *.zip -m manifest-dev.yml -v ${env.BUILD_NUMBER} -n ${appName}"
            }
            post {
                success {
                    echo "Deploy Artifacts stage completed"
                }
                failure {
                    echo "Deploy Artifacts stage failed"
                }
            }
        }*/

        stage('Publish Artifacts') {
            agent {
                docker {
                    image 'repo.ci.build.ge.com:8443/jfrog-cli-go'
                    label 'dind'
                }
            }
            environment {
                ARTIFACTORY = credentials('ARTIFACTORY_CRED')
            }
            when {
                branch 'master'
            }
            steps {
                script {
                    echo 'Publishing Artifacts to Artifactory'
                    unstash 'artifact'
                    def uploadSpec = """{
                        "files": [
                            {
                                "pattern": "${appName}*.zip",
                                "target": "${Repository}/com/ge/digital/${appName}/"
                            }
                        ]
                    }"""
                    artUploadServer.username = env.ARTIFACTORY_USR
                    artUploadServer.password = env.ARTIFACTORY_PSW
                    def buildInfo = artUploadServer.upload(uploadSpec)
                    artUploadServer.publishBuildInfo(buildInfo)
                }
            }
            post {
                success {
                    echo 'Deploy Artifact to Artifactory stage completed'
                }
                failure {
                    echo 'Deploy Artifact to Artifactory stage failed'
                }
            }
        }

    }
    post {
        success {
            echo 'Build completed'
        }
        failure {
            echo 'Build failed'
            mail to:"stephane.pilla@ge.com, mathieu.clement@ge.com", subject:"FAILURE: ${currentBuild.fullDisplayName}", body: "Boo, we failed. See build error in here: ${env.BUILD_URL}\n${currentBuild.rawBuild.getLog(100)}"
        }
    }

}
