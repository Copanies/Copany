

## --- Build stage (like buildpacks would do) ---
FROM node:23-alpine AS builder

# Set working directory
WORKDIR /workspace

 # Accept build-time arguments (from .env.build.yaml)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG NEXT_PUBLIC_GITHUB_APP_NAME
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG NEXT_PUBLIC_FIGMA_CLIENT_ID
ARG FIGMA_CLIENT_SECRET
 # Add more ARGs as needed for your build-time envs

# Make them available as environment variables during build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV NEXT_PUBLIC_GITHUB_APP_NAME=$NEXT_PUBLIC_GITHUB_APP_NAME
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ENV NEXT_PUBLIC_FIGMA_CLIENT_ID=$NEXT_PUBLIC_FIGMA_CLIENT_ID
ENV FIGMA_CLIENT_SECRET=$FIGMA_CLIENT_SECRET

# Install dependencies
COPY package*.json ./
RUN npm install --frozen-lockfile

# Copy source code and build
COPY . .
RUN npm run build

# --- Production stage ---
FROM node:23-alpine AS runner

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Set working directory
WORKDIR /app

# Copy build output from builder
COPY --from=builder /workspace/.next/standalone ./
COPY --from=builder /workspace/.next/static ./.next/static
COPY --from=builder /workspace/public ./public
COPY --from=builder /workspace/package.json ./package.json

# Expose the port Cloud Run expects
EXPOSE 8080

# Start the Next.js standalone server
CMD ["node", "server.js"]