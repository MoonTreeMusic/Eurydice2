#!/bin/bash
set -e

echo "Starting deployment to $AZURE_WEBAPP_NAME (slot: $AZURE_SLOT)..."

az webapp deploy \
  --resource-group eurydice-rg \
  --name $AZURE_WEBAPP_NAME \
  --slot $AZURE_SLOT \
  --src-path api/dist \
  --type zip \
  --clean true

echo "Deployment complete!"