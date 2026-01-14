# Cloudflare Pages Deployment Guide

## Overview

Your MTG Board State Manager has been migrated from Netlify to Cloudflare Pages. The serverless function has been converted to a Cloudflare Pages Function.

## What Changed

1. **New Function Location:** `functions/fetch-deck.js` (Cloudflare format)
   - Old location: `netlify/functions/fetch-deck.js` (still present for reference)
   
2. **Function Syntax:** Converted from Netlify's `exports.handler` to Cloudflare's `export async function onRequest(context)`

3. **API Path:** Updated from `/.netlify/functions/fetch-deck` to `/functions/fetch-deck`

4. **Local Testing:** The `local_server.js` now supports both paths for seamless development

## Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Migrate to Cloudflare Pages"
git push origin main
```

### 2. Set Up Cloudflare Pages

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**
3. Select your GitHub repository
4. Configure the build settings:
   - **Production branch:** `main` (or your default branch)
   - **Build command:** Leave empty
   - **Build output directory:** `/` or leave empty
   - **Root directory:** Leave as `/`
5. Click **Save and Deploy**

### 3. Automatic Deployment
- Cloudflare Pages will automatically detect the `functions/` folder
- The `fetch-deck.js` function will be deployed as a serverless function
- Future pushes to your repository will trigger automatic deployments

## Testing Your Deployment

Once deployed, test the deck import feature:

1. Open your Cloudflare Pages URL
2. Paste a Moxfield or Archidekt deck URL
3. Click Import
4. The deck should load successfully

## Local Development

To test locally:

1. Run `start_app.bat` (Windows) or `node local_server.js`
2. Open `http://localhost:3000`
3. The local server supports both Netlify and Cloudflare function paths

## Files You Can Delete (Optional)

After confirming everything works on Cloudflare:

- `netlify.toml` - No longer needed
- `netlify/` folder - Legacy Netlify function

Keep these during the transition period to ensure smooth migration.

## Troubleshooting

### Function Not Found Error

- Verify the `functions/` folder is at the root of your repository
- Check Cloudflare Pages dashboard to ensure the function was deployed
- Look at the Functions tab in your deployment details

### CORS Errors

- Cloudflare Pages handles CORS automatically for same-origin requests
- If issues persist, you can add CORS headers to the function response

### Build Failures

- This is a static site with serverless functions - no build step required
- Ensure you didn't accidentally set a build command in Cloudflare settings

## Support Resources

- [Cloudflare Pages Functions Documentation](https://developers.cloudflare.com/pages/platform/functions/)
- [Cloudflare Pages GitHub Integration](https://developers.cloudflare.com/pages/platform/git-integration/)
