pipeline {
    agent any

    environment {
        AWS_ACCOUNT_ID    = '424180637140'
        AWS_REGION        = 'ap-south-1'
        ECR_REGISTRY      = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        BACKEND_ECR_REPO  = "${ECR_REGISTRY}/bookstore-backend"
        FRONTEND_ECR_REPO = "${ECR_REGISTRY}/bookstore-frontend"
        IMAGE_TAG         = "${BUILD_NUMBER}"
        MANIFESTS_REPO    = "github.com/amanshukla0903/bookstore-manifests.git"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                echo "Build #${BUILD_NUMBER}"
            }
        }

        stage('Tests') {
            steps {
                dir('backend') {
                    sh 'npm install && npm test'
                }
            }
        }

        stage('ECR Login') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    crane auth login ${ECR_REGISTRY} -u AWS --password-stdin
                    echo "✅ ECR Login successful"
                """
            }
        }

        stage('Tag & Push Images') {
            parallel {
                stage('Backend') {
                    steps {
                        sh """
                            crane copy ${BACKEND_ECR_REPO}:v1 ${BACKEND_ECR_REPO}:${IMAGE_TAG}
                            echo "✅ Backend: ${BACKEND_ECR_REPO}:${IMAGE_TAG}"
                        """
                    }
                }
                stage('Frontend') {
                    steps {
                        sh """
                            crane copy ${FRONTEND_ECR_REPO}:v1 ${FRONTEND_ECR_REPO}:${IMAGE_TAG}
                            echo "✅ Frontend: ${FRONTEND_ECR_REPO}:${IMAGE_TAG}"
                        """
                    }
                }
            }
        }

        stage('Update Manifests') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-pat',
                    usernameVariable: 'GIT_USERNAME',
                    passwordVariable: 'GIT_PASSWORD'
                )]) {
                    sh """
                        rm -rf bookstore-manifests
                        git clone https://${GIT_USERNAME}:${GIT_PASSWORD}@${MANIFESTS_REPO} bookstore-manifests
                        cd bookstore-manifests

                        sed -i "s|image: .*bookstore-backend:.*|image: ${BACKEND_ECR_REPO}:${IMAGE_TAG}|" backend/deployment.yaml
                        sed -i "s|image: .*bookstore-frontend:.*|image: ${FRONTEND_ECR_REPO}:${IMAGE_TAG}|" frontend/deployment.yaml

                        git config user.name "Jenkins CI"
                        git config user.email "jenkins@bookstore.com"
                        git add .
                        git diff --staged --quiet || git commit -m "Build #${BUILD_NUMBER}: Deploy tag ${IMAGE_TAG}"
                        git push origin main
                    """
                }
            }
        }

        stage('ArgoCD Sync') {
            steps {
                echo "✅ Manifests updated! ArgoCD will auto-sync."
            }
        }
    }

    post {
        success { echo "✅ Build #${BUILD_NUMBER} SUCCESS!" }
        failure { echo "❌ Build #${BUILD_NUMBER} FAILED!" }
        always  { cleanWs() }
    }
}
