# Deploy KojoMoney to Render.com

Your code is now on GitHub! Follow these steps to deploy to Render.com (free tier).

## Step 1: Create a Render Account
1. Go to https://render.com
2. Click "Sign up"
3. Sign up with GitHub (easiest option)
4. Authorize Render to access your GitHub account

## Step 2: Create a Web Service on Render
1. Click "New+" button (top right)
2. Select "Web Service"
3. Click "Connect a repository"
4. Find and select `Frankimoney/Kojomoney`
5. Click "Connect"

## Step 3: Configure the Service
Fill in these details:

- **Name**: `kojomoney-api` (or any name)
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node .next/standalone/server.js`
- **Plan**: Select `Free`

## Step 4: Add Environment Variables
Before deploying, add these environment variables in Render:

1. Click "Environment" tab
2. Add these variables (copy from your `.env.local` file):

```
FIREBASE_PROJECT_ID=kojomoney-6e131
FIREBASE_CLIENT_EMAIL=your-service-account-email@xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your-firebase-private-key
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-render-url.onrender.com (you'll get this after first deploy)
NODE_ENV=production
PORT=3000
```

### How to get Firebase credentials:
1. Go to Firebase Console: https://console.firebase.google.com
2. Select `kojomoney-6e131` project
3. Go to Settings (gear icon) → Service Accounts
4. Click "Generate New Private Key"
5. Copy the JSON content - use:
   - `project_id` → FIREBASE_PROJECT_ID
   - `client_email` → FIREBASE_CLIENT_EMAIL
   - `private_key` → FIREBASE_PRIVATE_KEY

## Step 5: Deploy
1. Click "Create Web Service"
2. Render will build and deploy your app
3. First build takes 2-3 minutes
4. Once done, you'll get a URL like: `https://kojomoney-api.onrender.com`

## Step 6: Update Android App
Once you have the Render URL:

1. Edit `capacitor.config.ts`:
```typescript
server: {
  androidScheme: 'https',
  url: 'https://your-render-url.onrender.com'  // Replace with your Render URL
}
```

2. Rebuild Android APK:
```bash
npx cap sync android
./gradlew -p android assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

3. Test on your phone - should now have full API functionality!

## Step 7: (Optional) Update Firebase Hosting
To make the web app also use the Render backend:

1. Create a `render.yaml` in root directory with API proxy config
2. Or configure Firebase Hosting rewrites to proxy API calls to Render

## What You Now Have
```
├── Web App: https://kojomoney-6e131.web.app
│   └─→ Static UI from Firebase Hosting
│   └─→ API calls proxy to Render backend
│
├── Android App: Downloaded from your phone
│   └─→ UI embedded in APK
│   └─→ API calls to Render backend
│
├── Backend: https://your-render-url.onrender.com
│   └─→ Handles all API routes
│   └─→ Connects to Firebase Realtime Database
│
└── Database: Firebase Realtime Database
    └─→ Shared by all apps
```

## Troubleshooting

**App won't start on Render:**
- Check logs in Render dashboard
- Verify environment variables are set correctly
- Make sure FIREBASE_PRIVATE_KEY includes newlines (copy exactly)

**Mobile app can't connect to Render:**
- Verify URL in capacitor.config.ts is exactly correct
- Check Render service is running (check Status page)
- Rebuild APK after updating config

**Free tier spins down after 15 minutes:**
- Service will take 10-30 seconds to wake up on first request
- For production, upgrade to paid plan ($7+/month)

## Next Steps
1. Create Render account with GitHub
2. Connect GitHub repository
3. Configure environment variables
4. Deploy
5. Update Capacitor config with Render URL
6. Rebuild and test Android APK

Good luck! 🚀
