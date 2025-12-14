# Vercel Deployment Guide

This guide explains how to deploy the TradePool UI to Vercel.

## Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- This repository pushed to GitHub

## Deployment Steps

### 1. Import Project to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository: `godemodegame/TradePool`
4. Click "Import"

### 2. Configure Project Settings

Vercel should automatically detect the configuration from `vercel.json`, but verify:

- **Framework Preset**: Vite
- **Root Directory**: Leave as `.` (root)
- **Build Command**: `cd apps/tradepool-ui && npm install && npm run build`
- **Output Directory**: `apps/tradepool-ui/dist`
- **Install Command**: `npm install --prefix apps/tradepool-ui`

### 3. Add Environment Variables

In the Vercel project settings, add the following environment variables:

**Required Variables:**
```
VITE_PACKAGE_ID=0x9e934ab240dfb05fa694c08bdde9ee95d2477b085b99ea5a141ffa5dfe57096e
VITE_REGISTRY_ID=0xb7c9e8afbbe759b4a4b492b1bdbe3d691d319edf5bce2e1525b2542bcbdf1a12
VITE_ADMIN_CAP_ID=0xa9136516365bf43580fef897a1ba12460b2f64a3e373108ebd06ae14971efbf6
VITE_MOMENTUM_VERSION_ID=0x83ea3e3e7384efd6b524ff973e4b627cd84d190c45d3f4fd9f5f4fc6c95fd26b
VITE_NETWORK=testnet
```

To add environment variables:
1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable with its value
4. Select "Production", "Preview", and "Development" for all variables

### 4. Deploy

Click "Deploy" button and wait for the build to complete.

### 5. Access Your Deployment

Once deployed, Vercel will provide you with a URL like:
- Production: `https://trade-pool.vercel.app`
- Preview: `https://trade-pool-git-branch.vercel.app`

## Automatic Deployments

Vercel will automatically deploy:
- **Production**: When you push to `main` branch
- **Preview**: When you create a pull request or push to other branches

## Local Testing Before Deploy

To test the production build locally:

```bash
cd apps/tradepool-ui
npm run build
npm run preview
```

## Troubleshooting

### Build Fails

1. Check the build logs in Vercel Dashboard
2. Verify all environment variables are set correctly
3. Test the build locally: `cd apps/tradepool-ui && npm run build`

### Environment Variables Not Working

- Make sure all variables start with `VITE_` prefix (required by Vite)
- Redeploy after adding/changing environment variables
- Clear Vercel cache: Settings → Clear Cache

### 404 on Routes

Vite SPA needs proper routing configuration. This is already handled in `vite.config.ts` but if you see 404s:
1. Check that `vercel.json` has the correct `outputDirectory`
2. Verify the build output exists in `apps/tradepool-ui/dist`

## Update Package ID

When you deploy a new version of the smart contract:

1. Update `.env` file locally with new `VITE_PACKAGE_ID`
2. Commit and push to GitHub
3. Go to Vercel Dashboard → Settings → Environment Variables
4. Update `VITE_PACKAGE_ID` with the new value
5. Trigger a new deployment (or wait for automatic deployment)

## Custom Domain

To add a custom domain:

1. Go to Vercel Dashboard → Settings → Domains
2. Add your domain name
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (automatic)

## Project Structure

```
TradePool/
├── apps/
│   └── tradepool-ui/          # Frontend application
│       ├── src/
│       ├── public/
│       ├── .env               # Local environment variables
│       ├── .env.example       # Template for environment variables
│       └── package.json
├── sources/                   # Smart contracts (not deployed to Vercel)
├── vercel.json               # Vercel configuration
└── .vercelignore             # Files to exclude from deployment
```

## Cost

Vercel Free Tier includes:
- Unlimited deployments
- 100 GB bandwidth per month
- Automatic HTTPS
- Preview deployments for PRs

This should be sufficient for most development and testing needs.

## Support

- Vercel Docs: https://vercel.com/docs
- Vite Docs: https://vitejs.dev/guide/
- Sui DApp Kit: https://sdk.mystenlabs.com/dapp-kit
