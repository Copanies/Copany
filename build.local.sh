#!/bin/bash
set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🚀 开始本地 Docker 构建...${NC}"

# 检查 .env.build.yaml 是否存在
if [ ! -f .env.build.yaml ]; then
    echo "❌ .env.build.yaml 文件不存在"
    exit 1
fi

# 读取环境变量
echo -e "${GREEN}📦 读取构建变量...${NC}"

# 从 .env.build.yaml 解析变量
export NEXT_PUBLIC_SUPABASE_URL=$(grep 'NEXT_PUBLIC_SUPABASE_URL:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep 'NEXT_PUBLIC_SUPABASE_ANON_KEY:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_SITE_URL=$(grep 'NEXT_PUBLIC_SITE_URL:' .env.build.yaml | sed 's/.*: //')
export SUPABASE_SERVICE_ROLE_KEY=$(grep 'SUPABASE_SERVICE_ROLE_KEY:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_GITHUB_APP_NAME=$(grep 'NEXT_PUBLIC_GITHUB_APP_NAME:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_GOOGLE_CLIENT_ID=$(grep 'NEXT_PUBLIC_GOOGLE_CLIENT_ID:' .env.build.yaml | sed 's/.*: //')
export GOOGLE_CLIENT_SECRET=$(grep 'GOOGLE_CLIENT_SECRET:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_FIGMA_CLIENT_ID=$(grep 'NEXT_PUBLIC_FIGMA_CLIENT_ID:' .env.build.yaml | sed 's/.*: //')
export FIGMA_CLIENT_SECRET=$(grep 'FIGMA_CLIENT_SECRET:' .env.build.yaml | sed 's/.*: //')

# 构建 Docker 镜像（与 cloudbuild.yaml 完全相同的参数）
echo -e "${GREEN}🔨 开始构建 Docker 镜像...${NC}"
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
  --build-arg SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  --build-arg NEXT_PUBLIC_GITHUB_APP_NAME="$NEXT_PUBLIC_GITHUB_APP_NAME" \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID="$NEXT_PUBLIC_GOOGLE_CLIENT_ID" \
  --build-arg GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  --build-arg NEXT_PUBLIC_FIGMA_CLIENT_ID="$NEXT_PUBLIC_FIGMA_CLIENT_ID" \
  --build-arg FIGMA_CLIENT_SECRET="$FIGMA_CLIENT_SECRET" \
  -t gcr.io/copany-820/copany-app \
  .

echo -e "${GREEN}✅ 构建完成！${NC}"
echo -e "${GREEN}镜像标签: gcr.io/copany-820/copany-app${NC}"
echo ""
echo "💡 本地测试："
echo "   docker run -p 8080:8080 gcr.io/copany-820/copany-app"