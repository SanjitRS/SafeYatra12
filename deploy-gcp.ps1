# Google Cloud Run Deployment Script
# Prerequisites: gcloud CLI installed and authenticated (gcloud auth login)

param(
    [Parameter(Mandatory=True)]
    [string],
    [string] = us-central1
)

Write-Host Setting active project: 
gcloud config set project 

Write-Host Deploying Authority Command Console to Cloud Run...
cd 'Authority part'
gcloud run deploy authority-console --source . --platform managed --region  --allow-unauthenticated --port 8080

Write-Host Deploying Tourist Safety Platform to Cloud Run...
cd '../Toursit Site'
gcloud run deploy tourist-safety-app --source . --platform managed --region  --allow-unauthenticated --port 8080

cd ..
Write-Host Deployment completed!
