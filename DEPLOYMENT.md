# KojoMoney - Firebase Deployment Guide

## Architecture
- **Web App**: Next.js server with API routes (dynamic server)
- **Mobile Apps**: Android & iOS load the same web app via Capacitor WebView
- **Backend**: API routes handle all data operations (auth, points, withdrawals, etc.)
- **Database**: Firestore (via Firebase Admin SDK in API routes)
- **Deployment**: Firebase Hosting + Cloud Functions for API routes

## Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project: `kojomoney-6e131`
3. Google Cloud project linked to Firebase

## Step-by-Step Deployment

### 1. Build the Next.js App (Server Build)
```bash
npm run build
```
This creates `.next/standalone` directory with the server and static files.

### 2. Deploy to Firebase Hosting
```bash
firebase deploy --only hosting --project kojomoney-6e131
```

### 3. Test Locally (Optional)
```bash
cd .next/standalone
NODE_ENV=production node server.js
# App runs on http://localhost:3000
```

### 4. Rebuild & Sync Android APK
After deployment, rebuild the mobile app:
```bash
npx cap sync
./gradlew assembleDebug
```

## How Web and Mobile Apps Share the Same Backend

### Web App
- Loads from: `https://kojomoney-6e131.web.app`
- API calls: `/api/auth/login`, `/api/ads`, `/api/news`, etc.

### Mobile App (Android/iOS)
- WebView loads the same static files from `.next/standalone/public`
- API calls: Same paths (`/api/auth/login`, `/api/ads`, `/api/news`)
- Relative URLs work because both share the same origin

### Database
- Both web and mobile apps use the same Firestore instance
- Both can use Firebase Authentication
- Both can receive Firebase Cloud Messaging notifications

## Configuration Files Updated

### firebase.json
- `hosting.public`: Points to `.next/standalone/public` (static files from server build)
- `hosting.rewrites`: Ensures SPA routing works for all non-API routes

### capacitor.config.ts
- `webDir`: Points to `.next/standalone/public`
- Mobile app loads bundled static files
- API calls use relative URLs (same as web)

### next.config.ts
- **Removed** `output: "export"` to enable dynamic server mode
- API routes are now available for both web and mobile

## Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Key Points

1. **Single Codebase**: One Next.js app serves both web and mobile
2. **API Routes**: Work the same way for web and mobile browsers
3. **Firebase Auth**: Handles authentication for both platforms
4. **localStorage**: Both web and mobile can use localStorage within WebView
5. **Push Notifications**: Firebase Cloud Messaging works for mobile via Capacitor plugins

## Troubleshooting

### API routes not working
- Ensure `output: "export"` is removed from next.config.ts
- Verify `npm run build` creates `.next/standalone` directory

### Mobile app can't call API
- Check Firestore security rules allow the API routes to function
- Verify both web and mobile point to same domain

### CSS/Styling issues
- Ensure `.next/standalone/public` contains CSS files
- Check browser DevTools Network tab for 404s on CSS files
