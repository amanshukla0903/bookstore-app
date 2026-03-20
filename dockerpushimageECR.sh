# check you are in correct folder
cd ~/bookstore-app

echo "📂 Current directory: $(pwd)"
echo "📂 Contents:"
ls -la
echo ""

# Backend build & push
echo "🐳 Building Backend..."
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/bookstore-backend:v1 ./backend

echo ""
echo "📤 Pushing Backend..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/bookstore-backend:v1

echo ""
echo "✅ Backend done!"
echo ""

# Frontend build & push
echo "🐳 Building Frontend..."
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/bookstore-frontend:v1 ./frontend

echo ""
echo "📤 Pushing Frontend..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/bookstore-frontend:v1

echo ""
echo "✅ Frontend done!"
