#!/bin/bash
set -e

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Starting local Docker build...${NC}"

# Check if .env.build.yaml exists
if [ ! -f .env.build.yaml ]; then
    echo "❌ .env.build.yaml file does not exist"
    exit 1
fi

# Read environment variables
echo -e "${GREEN}📦 Loading build variables...${NC}"

# Parse variables from .env.build.yaml
export NEXT_PUBLIC_SUPABASE_URL=$(grep 'NEXT_PUBLIC_SUPABASE_URL:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep 'NEXT_PUBLIC_SUPABASE_ANON_KEY:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_SITE_URL=$(grep 'NEXT_PUBLIC_SITE_URL:' .env.build.yaml | sed 's/.*: //')
export SUPABASE_SERVICE_ROLE_KEY=$(grep 'SUPABASE_SERVICE_ROLE_KEY:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_GITHUB_APP_NAME=$(grep 'NEXT_PUBLIC_GITHUB_APP_NAME:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_GOOGLE_CLIENT_ID=$(grep 'NEXT_PUBLIC_GOOGLE_CLIENT_ID:' .env.build.yaml | sed 's/.*: //')
export GOOGLE_CLIENT_SECRET=$(grep 'GOOGLE_CLIENT_SECRET:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_FIGMA_CLIENT_ID=$(grep 'NEXT_PUBLIC_FIGMA_CLIENT_ID:' .env.build.yaml | sed 's/.*: //')
export FIGMA_CLIENT_SECRET=$(grep 'FIGMA_CLIENT_SECRET:' .env.build.yaml | sed 's/.*: //')
export NEXT_PUBLIC_DISCORD_CLIENT_ID=$(grep 'NEXT_PUBLIC_DISCORD_CLIENT_ID:' .env.build.yaml | sed 's/.*: //')
export DISCORD_CLIENT_SECRET=$(grep 'DISCORD_CLIENT_SECRET:' .env.build.yaml | sed 's/.*: //')

# Build Docker image (using exactly the same parameters as cloudbuild.yaml)
echo -e "${GREEN}🔨 Building Docker image...${NC}"
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
  --build-arg NEXT_PUBLIC_DISCORD_CLIENT_ID="$NEXT_PUBLIC_DISCORD_CLIENT_ID" \
  --build-arg DISCORD_CLIENT_SECRET="$DISCORD_CLIENT_SECRET" \
  -t gcr.io/copany-820/copany-app \
  .

echo -e "${GREEN}✅ Build finished!${NC}"
echo -e "${GREEN}Image tag: gcr.io/copany-820/copany-app${NC}"
echo ""
echo "💡 Local test:"
echo "   docker run -p 8080:8080 gcr.io/copany-820/copany-app"