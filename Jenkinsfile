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
                echo "Build #${BUILD_NUMBER} started"
            }
        }

        stage('Tests') {
            steps {
                dir('backend') {
                    sh 'npm install && npm test'
                }
            }
        }

        stage('Refresh ECR Token') {
            steps {
                sh '''
                    TOKEN=$(aws ecr get-login-password --region ap-south-1)
                    kubectl delete secret ecr-credentials -n jenkins 2>/dev/null || true
                    kubectl create secret docker-registry ecr-credentials \
                        --docker-server=$AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com \
                        --docker-username=AWS \
                        --docker-password=$TOKEN \
                        -n jenkins
                    echo "ECR token refreshed"
                '''
            }
        }

        stage('Build & Push Images') {
            parallel {
                stage('Backend Image') {
                    steps {
                        sh '''
                            echo "Building backend..."

                            kubectl delete pod kaniko-backend-$BUILD_NUMBER -n jenkins 2>/dev/null || true
                            kubectl delete configmap backend-src-$BUILD_NUMBER -n jenkins 2>/dev/null || true

                            kubectl create configmap backend-src-$BUILD_NUMBER \
                                --from-file=Dockerfile=backend/Dockerfile \
                                --from-file=server.js=backend/server.js \
                                --from-file=package.json=backend/package.json \
                                -n jenkins

                            cat <<KEOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-backend-$BUILD_NUMBER
  namespace: jenkins
spec:
  initContainers:
    - name: copy-source
      image: busybox
      command:
        - sh
        - -c
        - |
          cp /src/Dockerfile /workspace/Dockerfile
          cp /src/server.js /workspace/server.js
          cp /src/package.json /workspace/package.json
          echo "Files copied:"
          ls -la /workspace/
      volumeMounts:
        - name: source
          mountPath: /src
        - name: workspace
          mountPath: /workspace
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:latest
      args:
        - "--dockerfile=/workspace/Dockerfile"
        - "--context=/workspace"
        - "--destination=$AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/bookstore-backend:$BUILD_NUMBER"
        - "--cache=false"
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
        - name: workspace
          mountPath: /workspace
  restartPolicy: Never
  volumes:
    - name: docker-config
      secret:
        secretName: ecr-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
    - name: source
      configMap:
        name: backend-src-$BUILD_NUMBER
    - name: workspace
      emptyDir: {}
KEOF

                            echo "Waiting for backend build..."
                            sleep 15
                            kubectl wait --for=jsonpath='{.status.phase}'=Succeeded \
                                pod/kaniko-backend-$BUILD_NUMBER -n jenkins --timeout=300s || true

                            STATUS=$(kubectl get pod kaniko-backend-$BUILD_NUMBER -n jenkins -o jsonpath='{.status.phase}')
                            echo "Status: $STATUS"

                            if [ "$STATUS" != "Succeeded" ]; then
                                echo "FAILED! Init container logs:"
                                kubectl logs kaniko-backend-$BUILD_NUMBER -n jenkins -c copy-source 2>/dev/null || true
                                echo "Kaniko logs:"
                                kubectl logs kaniko-backend-$BUILD_NUMBER -n jenkins -c kaniko 2>/dev/null || true
                                kubectl delete pod kaniko-backend-$BUILD_NUMBER -n jenkins 2>/dev/null || true
                                kubectl delete configmap backend-src-$BUILD_NUMBER -n jenkins 2>/dev/null || true
                                exit 1
                            fi

                            echo "Backend pushed!"
                            kubectl delete pod kaniko-backend-$BUILD_NUMBER -n jenkins 2>/dev/null || true
                            kubectl delete configmap backend-src-$BUILD_NUMBER -n jenkins 2>/dev/null || true
                        '''
                    }
                }
                stage('Frontend Image') {
                    steps {
                        sh '''
                            echo "Building frontend..."

                            kubectl delete pod kaniko-frontend-$BUILD_NUMBER -n jenkins 2>/dev/null || true
                            kubectl delete configmap frontend-src-$BUILD_NUMBER -n jenkins 2>/dev/null || true

                            kubectl create configmap frontend-src-$BUILD_NUMBER \
                                --from-file=Dockerfile=frontend/Dockerfile \
                                --from-file=index.html=frontend/index.html \
                                --from-file=style.css=frontend/style.css \
                                --from-file=nginx.conf=frontend/nginx.conf \
                                -n jenkins

                            cat <<KEOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-frontend-$BUILD_NUMBER
  namespace: jenkins
spec:
  initContainers:
    - name: copy-source
      image: busybox
      command:
        - sh
        - -c
        - |
          cp /src/Dockerfile /workspace/Dockerfile
          cp /src/index.html /workspace/index.html
          cp /src/style.css /workspace/style.css
          cp /src/nginx.conf /workspace/nginx.conf
          echo "Files copied:"
          ls -la /workspace/
      volumeMounts:
        - name: source
          mountPath: /src
        - name: workspace
          mountPath: /workspace
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:latest
      args:
        - "--dockerfile=/workspace/Dockerfile"
        - "--context=/workspace"
        - "--destination=$AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/bookstore-frontend:$BUILD_NUMBER"
        - "--cache=false"
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
        - name: workspace
          mountPath: /workspace
  restartPolicy: Never
  volumes:
    - name: docker-config
      secret:
        secretName: ecr-credentials
        items:
          - key: .dockerconfigjson
            path: config.json
    - name: source
      configMap:
        name: frontend-src-$BUILD_NUMBER
    - name: workspace
      emptyDir: {}
KEOF

                            echo "Waiting for frontend build..."
                            sleep 15
                            kubectl wait --for=jsonpath='{.status.phase}'=Succeeded \
                                pod/kaniko-frontend-$BUILD_NUMBER -n jenkins --timeout=300s || true

                            STATUS=$(kubectl get pod kaniko-frontend-$BUILD_NUMBER -n jenkins -o jsonpath='{.status.phase}')
                            echo "Status: $STATUS"

                            if [ "$STATUS" != "Succeeded" ]; then
                                echo "FAILED! Logs:"
                                kubectl logs kaniko-frontend-$BUILD_NUMBER -n jenkins -c copy-source 2>/dev/null || true
                                kubectl logs kaniko-frontend-$BUILD_NUMBER -n jenkins -c kaniko 2>/dev/null || true
                                kubectl delete pod kaniko-frontend-$BUILD_NUMBER -n jenkins 2>/dev/null || true
                                kubectl delete configmap frontend-src-$BUILD_NUMBER -n jenkins 2>/dev/null || true
                                exit 1
                            fi

                            echo "Frontend pushed!"
                            kubectl delete pod kaniko-frontend-$BUILD_NUMBER -n jenkins 2>/dev/null || true
                            kubectl delete configmap frontend-src-$BUILD_NUMBER -n jenkins 2>/dev/null || true
                        '''
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
                    sh '''
                        rm -rf bookstore-manifests
                        git clone https://$GIT_USERNAME:$GIT_PASSWORD@$MANIFESTS_REPO bookstore-manifests
                        cd bookstore-manifests

                        sed -i "s|image: .*bookstore-backend:.*|image: $BACKEND_ECR_REPO:$IMAGE_TAG|" backend/deployment.yaml
                        sed -i "s|image: .*bookstore-frontend:.*|image: $FRONTEND_ECR_REPO:$IMAGE_TAG|" frontend/deployment.yaml

                        git config user.name "Jenkins CI"
                        git config user.email "jenkins@bookstore.com"
                        git add .
                        git diff --staged --quiet || git commit -m "Build #$BUILD_NUMBER: Deploy tag $IMAGE_TAG"
                        git push origin main
                    '''
                }
            }
        }

        stage('ArgoCD Auto-Sync') {
            steps {
                echo "Manifests updated! ArgoCD will auto-sync."
            }
        }
    }

    post {
        success { echo "SUCCESS! Build #${BUILD_NUMBER}" }
        failure { echo "FAILED! Build #${BUILD_NUMBER}" }
        always  { cleanWs() }
    }
}
