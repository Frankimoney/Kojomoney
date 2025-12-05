# Deployment Guide - Push to GitHub, Firebase & Render

## 🚀 Quick Deployment Steps

### Step 1: Commit to GitHub
```bash
# Add all new security files and changes
git add -A

# Commit with descriptive message
git commit -m "feat: Add enterprise-grade security with 2FA email verification

- Add username & password authentication
- Implement two-factor email verification (6-digit codes)
- Add PBKDF2-SHA512 password hashing
- Create security utilities and APIs
- Add comprehensive security documentation
- Update AuthSystem UI for 2FA flows
- Add security logging and audit trails"

# Push to GitHub
git push origin main
```

### Step 2: Deploy to Firebase Hosting (Web)
```bash
# Build the Next.js app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Step 3: Update Render Backend (if running API there)
```bash
# No action needed - Render will auto-deploy when it detects GitHub push
# Or manually trigger via Render dashboard:
# 1. Go to your service on render.com
# 2. Click "Manual Deploy" or wait for auto-deploy
```

---

## 📋 Detailed Steps

### **Step 1: Commit and Push to GitHub**

```bash
# Navigate to project directory
cd c:\Users\NWAJI\Desktop\kojomoney

# Stage all changes
git add -A

# Verify what will be committed
git status

# Commit with detailed message
git commit -m "feat: Add enterprise-grade 2FA security system

BREAKING CHANGE: Login now requires username, password, and email verification

Features:
- Username-based authentication (can also use email)
- Strong password requirements with real-time strength indicator
- Two-factor email verification with 6-digit codes
- PBKDF2-SHA512 password hashing with 100,000 iterations
- Security audit logging for all login attempts
- Support for both registration and login 2FA

Files Added:
- src/lib/security.ts: Password hashing and validation utilities
- src/app/api/auth/send-verification/route.ts: Send verification codes
- src/app/api/auth/verify-code/route.ts: Verify codes
- Comprehensive security documentation (9 files)

Files Modified:
- src/components/AuthSystem.tsx: Complete UI redesign for 2FA
- src/app/api/auth/register/route.ts: Add username and password requirements
- src/app/api/auth/login/route.ts: Add password verification and 2FA

Dependencies:
- Added nodemailer for email verification

Documentation:
- SECURITY_ENHANCEMENTS.md: Technical specifications
- SECURITY_SETUP.md: Setup and configuration guide
- SECURITY_FAQ.md: FAQs and troubleshooting
- DEPLOYMENT_CHECKLIST.md: Pre-launch checklist"

# Push to GitHub
git push origin main
```

### **Step 2: Deploy to Firebase Hosting**

```bash
# First, make sure you're logged in to Firebase
firebase login

# Build the production app
npm run build

# Deploy to Firebase (hosting only)
firebase deploy --only hosting

# Or deploy everything
firebase deploy
```

**Firebase will deploy:**
- Web app to `https://kojomoney-6e131.web.app`
- Updated API routes
- Updated Firestore security rules (if any)

### **Step 3: Update Render Backend**

Render will **automatically detect** your GitHub push and start redeploying.

**To verify or manually trigger:**
1. Go to https://render.com
2. Find your KojoMoney service
3. Check the "Deployments" tab
4. If auto-deploy hasn't started, click "Manual Deploy"

**What Render will do:**
- Pull latest code from GitHub
- Run `npm install`
- Build the app
- Restart with new code

---

## 🔧 Environment Variables to Add

### **For Firebase Hosting** (if needed)
```
# Usually not needed as it inherits from firebase.json
# But add to .env if using client-side env vars
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kojomoney-6e131
```

### **For Render Backend** (UPDATE THESE!)
Add these to your Render dashboard under Environment:

```
# Existing variables (already set)
FIREBASE_PROJECT_ID=kojomoney-6e131
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# NEW: Email verification service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@kojomoney.com

# Existing
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-render-url.onrender.com
NODE_ENV=production
PORT=3000
```

**How to add SMTP vars in Render:**
1. Go to your service on render.com
2. Click "Environment"
3. Add each variable:
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `587`
   - etc.
4. Click "Save" (will auto-redeploy)

---

## 📱 Update Capacitor Config (for Android/iOS)

If you need to update your mobile app:

```bash
# No code changes needed for new security
# The mobile app will automatically get the new auth endpoints
# Just rebuild APK if desired

npx cap sync android
./gradlew -p android assembleDebug
```

---

## ✅ Verification Checklist

After deployment:

### GitHub
- [ ] Code pushed to main branch
- [ ] All files committed (including documentation)
- [ ] No uncommitted changes

### Firebase Hosting
- [ ] Build completed successfully
- [ ] Web app deployed
- [ ] Can access https://kojomoney-6e131.web.app
- [ ] Login/Register page shows new UI

### Render Backend
- [ ] Service shows "deployed" status
- [ ] No build errors in logs
- [ ] API endpoints accessible
- [ ] SMTP variables set correctly

### Testing
- [ ] Test registration with new flow
- [ ] Test email verification code
- [ ] Test login with username
- [ ] Test login with email
- [ ] Verify codes expire correctly

---

## 🆘 Troubleshooting

### Firebase Deployment Error
```bash
# Check if you're logged in
firebase login

# Check project setup
firebase projects:list

# Try deploying again with verbose output
firebase deploy --only hosting --debug
```

### Render Deployment Stuck
- Check Render dashboard logs
- Look for build errors
- Verify environment variables are correct
- Check if GitHub connection is authorized
- Manually click "Manual Deploy"

### Email Verification Not Sending
- Verify SMTP variables are correct in Render
- Check that Gmail App Password is used (not regular password)
- Look at Render logs for email errors
- Test email manually from dashboard

### "Email already registered" on old accounts
- This is expected - old users need to migrate
- They can reset their password or create new account

---

## 📊 Deployment Timeline

```
Step 1: Git Commit & Push
├─ Time: ~1 minute
├─ Action: git add, commit, push
└─ Result: Code on GitHub

Step 2: Firebase Deploy
├─ Time: ~3-5 minutes
├─ Action: npm build, firebase deploy
└─ Result: Web app updated

Step 3: Render Auto-Deploy
├─ Time: ~5-10 minutes (automatic)
├─ Trigger: GitHub webhook
└─ Result: Backend API updated

Total Time: ~10-15 minutes ⏱️
```

---

## 🔄 Rollback Plan

If something goes wrong:

### **Firebase Rollback**
```bash
# Firebase keeps previous versions automatically
# Go to Firebase console and select previous deployment
```

### **GitHub Rollback**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push origin main -f  # Force push (only if necessary)
```

### **Render Rollback**
- Render keeps previous deployments
- Go to "Deployments" tab and click "Rollback"

---

## 📞 Support

### If Firebase deployment fails:
1. Check firebase.json configuration
2. Verify you're logged in: `firebase login`
3. Check build succeeds: `npm run build`
4. Try again with debug: `firebase deploy --debug`

### If Render deployment fails:
1. Check Render dashboard logs
2. Verify environment variables
3. Check GitHub connection
4. Try "Manual Deploy" button

### If email verification doesn't work:
1. Verify SMTP settings in Render
2. Check Gmail App Password (16 chars, no spaces)
3. Review Render application logs
4. Test locally first: `npm run dev`

---

## 🎯 What Gets Updated Where

| Component | Location | What Updates | When |
|-----------|----------|--------------|------|
| **Web App** | Firebase Hosting | UI & client logic | `firebase deploy` |
| **API Routes** | Firebase Functions OR Render | Backend endpoints | GitHub push OR `firebase deploy` |
| **Database** | Firestore | Schema (if changed) | `firebase deploy` |
| **Mobile App** | Android/iOS | Only if rebuilt | Manual rebuild needed |
| **Documentation** | GitHub | Markdown files | `git push` |

---

## ✨ Final Notes

- **Everything is automated** after you push to GitHub and run Firebase deploy
- **Render auto-deploys** when it detects GitHub changes
- **No downtime** during deployment
- **Rollback available** if needed
- **Old users will need to migrate** to new 2FA system on first login

---

## 🚀 Ready to Deploy?

Run these commands in order:

```bash
# 1. Commit and push to GitHub
git add -A
git commit -m "feat: Add 2FA security system"
git push origin main

# 2. Deploy to Firebase
npm run build
firebase deploy --only hosting

# 3. Wait for Render auto-deploy (5-10 minutes)
# Or manually trigger in Render dashboard
```

**That's it! Your new security system is live!** 🎉

---

**Questions? Check:**
- SECURITY_SETUP.md for configuration help
- DEPLOYMENT_CHECKLIST.md for testing steps
- SECURITY_FAQ.md for user questions
