#!/bin/bash
set -e

# Generate substitutions parameter
SUBS=$(grep -v '^\s*#' .env.build.yaml | grep -v '^\s*$' | sed 's/: /=/g' | sed 's/^/_/g' | tr '\n' ',' | sed 's/,$//')

# Submit build
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions $SUBS