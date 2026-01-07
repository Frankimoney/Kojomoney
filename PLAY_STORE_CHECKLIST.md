# Google Play Store Submission Checklist

## 📱 KojoMoney - Play Store Release Guide

**App Package:** `com.kojomoney.app`  
**Current Version:** 1.0.0 (versionCode: 1)  
**Last Updated:** January 7, 2026

---

## ✅ Pre-Submission Technical Checklist

### Build Configuration
- [x] Package name configured: `com.kojomoney.app`
- [x] Version name: `1.0.0`
- [x] Version code: `1`
- [x] Minification enabled (`minifyEnabled true`)
- [x] Resource shrinking enabled (`shrinkResources true`)
- [x] ProGuard optimization configured
- [ ] **Release keystore created and secured**
- [ ] **Signed AAB built**

### App Icons & Graphics
- [x] App icon in all densities (mipmap-hdpi to xxxhdpi)
- [x] Round icon variant
- [x] Adaptive icon (foreground + background)
- [x] Splash screen (portrait/landscape, day/night)

### Core Features
- [x] Firebase Analytics integrated
- [x] Firebase Crashlytics integrated
- [x] Firebase Cloud Messaging (Push notifications)
- [x] AdMob with mediation adapters
- [x] Deep link handling (`kojomoney://`)

### Legal & Compliance
- [x] Privacy Policy page (`/privacy`)
- [x] Terms of Service page (`/terms`)
- [x] GDPR page (`/gdpr`)
- [x] Cookies policy (`/cookies`)

---

## 📝 Play Console Store Listing

### Basic Info
- [ ] **App Name:** KojoMoney (max 30 characters)
- [ ] **Short Description:** (max 80 characters)
  > Earn rewards by completing tasks, watching ads, and playing games!
- [ ] **Full Description:** (max 4000 characters)
  > [Write a compelling description covering all features]

### Graphics (Required)
- [ ] **App Icon:** 512x512 PNG (no transparency, no rounded corners)
- [ ] **Feature Graphic:** 1024x500 JPG/PNG
- [ ] **Phone Screenshots:** Min 2, recommended 8 (16:9 or 9:16)
- [ ] **Tablet Screenshots:** Min 1 for 7" and 10" tablets

### Categorization
- [ ] **Category:** Finance > Rewards
- [ ] **Tags:** rewards, earn money, cash back, surveys, games

---

## 🔐 App Signing

### Create Release Keystore
```bash
keytool -genkey -v -keystore kojomoney-release.keystore -alias kojomoney -keyalg RSA -keysize 2048 -validity 10000
```

### Keystore Details (SAVE SECURELY!)
- **Keystore file:** `kojomoney-release.keystore`
- **Key alias:** `kojomoney`
- **Validity:** 10,000 days (~27 years)
- **Store password:** [YOUR_PASSWORD]
- **Key password:** [YOUR_PASSWORD]

⚠️ **IMPORTANT:** Back up your keystore! If lost, you cannot update your app.

---

## 📋 Play Console Forms

### 1. App Content
- [ ] **Privacy Policy URL:** `https://kojomoney-6e131.web.app/privacy`
- [ ] **Ads Declaration:** Yes (app contains ads)
- [ ] **Content Rating:** Complete questionnaire
- [ ] **Target Audience:** 18+ (rewards/money app)
- [ ] **News App:** No

### 2. Data Safety
Declare data collected:
- [ ] **Account info:** Email, name
- [ ] **Financial info:** Withdrawal details
- [ ] **Device info:** Device ID for analytics
- [ ] **App activity:** In-app actions
- [ ] **Location:** Country (for offers)

### 3. App Access (if needed)
If app has login:
- [ ] Provide test account credentials
- [ ] Or instructions to create account

---

## 🚀 Build & Upload Process

### Step 1: Build Static Export
```bash
npm run build:static
```

### Step 2: Sync Capacitor
```bash
npx cap sync android
```

### Step 3: Open Android Studio
```bash
npx cap open android
```

### Step 4: Generate Signed Bundle
1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Choose your keystore
4. Select **release** build variant
5. Wait for build to complete
6. Find AAB at: `android/app/release/app-release.aab`

### Step 5: Upload to Play Console
1. Go to [Play Console](https://play.google.com/console)
2. Create new app (or select existing)
3. Go to **Release → Production**
4. Upload your AAB file
5. Complete all required information
6. Submit for review

---

## ⚠️ Special Considerations for Rewards Apps

Google has strict policies for apps offering real rewards:

1. **Clear Terms:** Explain how rewards work
2. **No Misleading Claims:** Be honest about earnings
3. **Age Restriction:** Target 18+ users
4. **Withdrawal Process:** Be transparent
5. **Anti-Fraud:** Have measures in place

### Potential Review Issues
- Manual review likely for rewards apps
- May request additional documentation
- Prepare business verification if needed
- Response time: 3-7 days typically

---

## 📊 Post-Launch Checklist

- [ ] Monitor Crashlytics for issues
- [ ] Check Play Console for ANRs/crashes
- [ ] Respond to user reviews
- [ ] Plan first update based on feedback
- [ ] Set up staged rollout for future updates

---

## 📞 Support

**Developer Email:** [Your support email]
**Privacy Policy:** https://kojomoney-6e131.web.app/privacy
**Terms of Service:** https://kojomoney-6e131.web.app/terms

---

## Version History

| Version | Code | Date | Notes |
|---------|------|------|-------|
| 1.0.0 | 1 | Jan 2026 | Initial release |

---

*Remember to increment `versionCode` for every Play Store upload!*
