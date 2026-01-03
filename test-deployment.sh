#!/bin/bash

echo "🚀 Starting Cloud Functions Deployment"
echo "======================================"

cd /home/dev2k/SynologyDrive/Developer/Angular/newbubble/dabubble

echo "📦 Building functions..."
cd functions && npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "🚢 Deploying functions..."
cd ..
firebase deploy --only functions --force 2>&1 | tee deployment.log

echo ""
echo "✅ Deployment complete!"
echo "📋 Check deployment.log for details"
