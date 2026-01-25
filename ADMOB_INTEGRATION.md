# AdMob Integration Guide for KojoMoney

## Overview

This document describes the AdMob integration in KojoMoney, including:
- Rewarded video ads (users watch to earn points)
- Banner ads (displayed at bottom of screen)
- Interstitial ads (full-screen between screens)
- Mediation with Meta, Unity, AppLovin, and Pangle

## Setup Steps

### 1. AdMob Console Configuration

1. **Create Ad Units** in the [AdMob Console](https://apps.admob.com/):
   - Go to Apps → KojoMoney → Ad units
   - Create the following ad units:
     - **Banner Ad** (Adaptive Banner recommended)
     - **Interstitial Ad**
     - **Rewarded Video Ad**

2. **Update Ad Unit IDs** in `src/services/adService.ts`:
   ```typescript
   export const AD_UNIT_IDS = {
     android: {
       banner: 'ca-app-pub-1074124909116054/YOUR_BANNER_ID',
       interstitial: 'ca-app-pub-1074124909116054/YOUR_INTERSTITIAL_ID',
       rewarded: 'ca-app-pub-1074124909116054/YOUR_REWARDED_ID',
     },
     ios: {
       banner: 'ca-app-pub-1074124909116054/YOUR_IOS_BANNER_ID',
       interstitial: 'ca-app-pub-1074124909116054/YOUR_IOS_INTERSTITIAL_ID',
       rewarded: 'ca-app-pub-1074124909116054/YOUR_IOS_REWARDED_ID',
     },
   }
   ```

3. **Disable Test Mode** before production:
   ```typescript
   export const AD_CONFIG = {
     useTestAds: false, // Set to false for production!
   }
   ```

### 2. Mediation Setup

Mediation is already configured in the native projects. Now you need to set it up in AdMob Console:

1. Go to **AdMob Console → Mediation → Create Mediation Group**

2. **Add Ad Sources**:
   - **Meta Audience Network (Facebook)**
     - Create an account at [Facebook Business](https://business.facebook.com/)
     - Get your Placement IDs
     - Add as an ad source in the mediation group
   
   - **Unity Ads**
     - Create an account at [Unity Dashboard](https://dashboard.unity3d.com/)
     - Get your Game ID and Placement IDs
     - Add as an ad source
   
   - **AppLovin**
     - Create an account at [AppLovin MAX](https://dash.applovin.com/)
     - Get your SDK Key
     - Add as an ad source
   
   - **Pangle (TikTok/ByteDance)**
     - Create an account at [Pangle](https://www.pangleglobal.com/)
     - Get your App ID and Placement IDs
     - Add as an ad source

3. **Configure Waterfall or Bidding**:
   - For maximum revenue, use **Bidding** (real-time auction)
   - Or set up a **Waterfall** with eCPM floors

### 3. Android Configuration

The following mediation adapters are already added to `android/app/build.gradle`:

```gradle
// Meta Audience Network
implementation 'com.google.ads.mediation:facebook:6.17.0.0'

// Unity Ads
implementation 'com.google.ads.mediation:unity:4.9.3.0'

// AppLovin
implementation 'com.google.ads.mediation:applovin:12.4.2.0'

// Pangle
implementation 'com.google.ads.mediation:pangle:5.9.0.6.0'
```

### 4. iOS Configuration

The following mediation adapters are already added to `ios/App/Podfile`:

```ruby
pod 'GoogleMobileAdsMediationFacebook'
pod 'GoogleMobileAdsMediationUnity'
pod 'GoogleMobileAdsMediationAppLovin'
pod 'GoogleMobileAdsMediationPangle'
```

After adding, run:
```bash
cd ios/App && pod install
```

## AdService API

### Initialization

The AdService is automatically initialized when the app loads via the `useAdsInitialization` hook in `EarnApp.tsx`.

### Showing Ads

```typescript
import AdService from '@/services/adService'

// Show rewarded ad (returns reward or null)
const reward = await AdService.showRewarded()
if (reward) {
  console.log(`User earned ${reward.amount} ${reward.type}`)
}

// Show interstitial ad
await AdService.showInterstitial()

// Show/hide banner
await AdService.showBanner('bottom')
await AdService.hideBanner()
```

### React Hooks

```typescript
import { useAdsInitialization, useBannerAd, useRewardedAd, useInterstitialAd } from '@/hooks/useAds'

// Initialize ads (call once in root component)
const { isInitialized, isLoading, error } = useAdsInitialization()

// Banner ads
const { isVisible, show, hide } = useBannerAd('bottom', true)

// Rewarded ads
const { show, isReady, isShowing, lastReward } = useRewardedAd()

// Interstitial ads
const { show, isReady, isShowing } = useInterstitialAd()
```

## Ad Placement Strategy

### Current Implementation

| Location | Ad Type | When Shown |
|----------|---------|------------|
| Home Tab | Banner | Always visible |
| Earn Tab | Banner | Always visible |
| Watch Ads Page | Rewarded | On user action |
| After Trivia | Interstitial | After completing trivia (optional) |

### Recommendations for Higher Revenue

1. **Banner Ads**: Show on all main screens (Home, Earn, Wallet)
2. **Interstitial Ads**: Show after completing tasks (trivia, reading news)
3. **Rewarded Ads**: 
   - Main earning mechanism
   - Offer bonus for watching extra ads
   - Use in daily challenges

## Compliance

### GDPR (Europe)
- AdMob handles consent via Google's UMP SDK
- The `requestTrackingAuthorization` flag prompts users appropriately

### iOS App Tracking Transparency (ATT)
- Enabled via `requestTrackingAuthorization: true` in initialization
- Shows iOS 14.5+ tracking prompt

### Children's Privacy (COPPA)
- If targeting children, add to `adService.ts`:
  ```typescript
  await AdMob.initialize({
    tagForChildDirectedTreatment: true,
  })
  ```

## Troubleshooting

### Ads Not Loading

1. **Check network connection**
2. **Verify ad unit IDs are correct**
3. **Ensure test mode is disabled for production**
4. **Check AdMob policy compliance** (account must be in good standing)

### Low Fill Rate

1. **Add more mediation networks**
2. **Lower eCPM floors in waterfall**
3. **Enable bidding for real-time competition**

### Low eCPM

1. **Enable more ad networks** (especially Meta and AppLovin)
2. **Use adaptive banners** (better user experience = higher eCPM)
3. **Optimize ad placements** (above the fold performs better)

## Metrics to Track

Monitor these in AdMob Console:

- **Fill Rate**: % of requests that return an ad
- **eCPM**: Effective cost per 1000 impressions
- **ARPDAU**: Average revenue per daily active user
- **Match Rate**: % of mediation requests that match

## Support

For AdMob issues:
- [AdMob Help Center](https://support.google.com/admob)
- [AdMob Community](https://support.google.com/admob/community)

For mediation SDK issues:
- [Meta Audience Network](https://developers.facebook.com/docs/audience-network/)
- [Unity Ads](https://docs.unity.com/ads/)
- [AppLovin](https://dash.applovin.com/documentation/)
- [Pangle](https://www.pangleglobal.com/support)
