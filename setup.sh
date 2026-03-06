#!/bin/bash

# Configuration - Replace these or set them as environment variables
export PROJECT_ID=$(gcloud config get-value project)
export BUCKET_NAME="${PROJECT_ID}-tos-outputs"
export REGION="us-central1"

echo "🚀 Starting setup for 'The Other Side' on project: $PROJECT_ID"

# 1. Enable Required Google Cloud APIs
echo "📡 Enabling APIs..."
gcloud services enable \
    aiplatform.googleapis.com \
    vision.googleapis.com \
    texttospeech.googleapis.com \
    storage.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com

# 2. Create the GCS Bucket for media outputs
echo "🪣 Creating Storage Bucket: $BUCKET_NAME"
gsutil mb -l $REGION gs://$BUCKET_NAME/

# 3. Make Bucket Objects Publicly Readable (for the Extension/Web App to see results)
# Note: In high-security environments, use Signed URLs instead.
echo "🔓 Setting public read access on bucket..."
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# 4. Set up Service Account permissions
echo "🔑 Configuring Service Account permissions..."
SERVICE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/storage.objectAdmin"

echo "✅ Setup Complete!"
echo "--------------------------------------------------------"
echo "Update your .env or Environment Variables with:"
echo "GOOGLE_CLOUD_PROJECT=$PROJECT_ID"
echo "GCS_BUCKET_NAME=$BUCKET_NAME"
echo "--------------------------------------------------------"