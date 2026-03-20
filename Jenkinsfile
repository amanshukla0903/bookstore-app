pipeline {
    agent any

    environment {
        AWS_ACCOUNT_ID    = '424180637140'
        AWS_REGION        = 'ap-south-1'
        ECR_REGISTRY      = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        BACKEND_ECR_REPO  = "${ECR_REGISTRY}/bookstore-backend"
        FRONTEND_ECR_REPO = "${ECR_REGISTRY}/bookstore-frontend"
        IMAGE_TAG         = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
        MANIFESTS_REPO    = "github.com/amanshukla0903/bookstore-manifests.git"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                echo "Tag: ${IMAGE_TAG}"
            }
        }

        stage('Tests') {
            steps {
                dir('backend') {
                    sh 'npm ci && npm test'
                }
            }
        }

        stage('ECR Login') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin ${ECR_REGISTRY}
                """
            }
        }

        stage('Build & Push Images') {
            parallel {
                stage('Backend') {
                    steps {
                        sh """
                            docker build -t ${BACKEND_ECR_REPO}:${IMAGE_TAG} ./backend
                            docker push ${BACKEND_ECR_REPO}:${IMAGE_TAG}
                        """
                    }
                }
                stage('Frontend') {
                    steps {
                        sh """
                            docker build -t ${FRONTEND_ECR_REPO}:${IMAGE_TAG} ./frontend
                            docker push ${FRONTEND_ECR_REPO}:${IMAGE_TAG}
                        """
                    }
                }
            }
        }

        stage('Update K8s Manifests') {
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
                        git diff --staged --quiet || git commit -m "Build #${BUILD_NUMBER}: Deploy ${IMAGE_TAG}"
                        git push origin main
                    """
                }
            }
        }

        stage('Wait for ArgoCD Sync') {
            steps {
                sh """
                    echo "Waiting for ArgoCD to detect and sync..."
                    sleep 15
                    echo "ArgoCD will auto-sync the changes to EKS"
                """
            }
        }
    }

    post {
        success {
            echo "SUCCESS! Images: ${IMAGE_TAG}"
        }
        failure {
            echo "FAILED! Check logs."
        }
        always {
            sh 'docker system prune -f || true'
            cleanWs()
        }
    }
}
