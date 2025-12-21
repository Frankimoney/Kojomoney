# Offerwall, Survey & Mission Database Integration

## Quick Start: Adding Affiliate Links

**Access the Admin Panel:** Navigate to `https://your-app-url.com/admin`

### How to Add a Mission with Your Affiliate Link:

1. Go to `/admin` in your browser
2. Click **"Add Mission"**
3. Fill in:
   - **Title**: What users will see (e.g., "Sign up for Binance")
   - **Points Reward**: How many points users earn
   - **Affiliate URL**: Paste your affiliate/referral link here
   - **Description**: What users need to do
   - **Steps**: Step-by-step instructions
4. Toggle **"Require Proof Screenshot"** if you want verification
5. Click **"Create Mission"**

That's it! Users will see the mission in Quick Missions with proper affiliate disclosure.

---

## Overview

This document describes the full database integration for the Offerwall, Survey, and Mission features in KojoMoney. All features have been migrated from hardcoded mock data to Firestore database with proper API endpoints and external SDK preparation.

## Architecture

### Database Collections

| Collection | Purpose |
|------------|---------|
| `offers` | Available offerwall tasks |
| `offer_completions` | User's offer completion tracking |
| `surveys` | Available surveys |
| `survey_completions` | User's survey completion tracking |
| `missions` | Available missions (affiliate offers) |
| `mission_progress` | User's mission progress |
| `affiliate_clicks` | Affiliate link click tracking for compliance |
| `transactions` | All point transactions |

### API Endpoints

#### Offers
- `GET /api/offers` - Fetch available offers with filtering
- `POST /api/offers` - Create new offer (admin)
- `POST /api/offers/start` - Start an offer (tracks user)
- `GET /api/offers/stats` - Get user's offer statistics
- `GET /api/offers/history` - Get user's completion history
- `POST /api/offers/callback` - Receive provider postbacks

#### Surveys
- `GET /api/surveys` - Fetch available surveys
- `POST /api/surveys` - Create new survey (admin)
- `POST /api/surveys/status` - Update survey completion status
- `GET /api/surveys/history` - Get completion history

#### Missions
- `GET /api/missions` - Fetch missions with user progress
- `POST /api/missions` - Create new mission (admin)
- `POST /api/missions/progress` - Update mission progress
- `POST /api/missions/track-click` - Track affiliate clicks

#### Admin Dashboard
- `GET /api/admin/stats` - Dashboard statistics (users, withdrawals, etc.)
- `GET /api/admin/users` - List and search users
- `GET /api/admin/withdrawals` - List withdrawal requests
- `POST /api/admin/withdrawals/process` - Approve/reject withdrawals
- `GET /api/admin/transactions` - View all transactions
- `POST /api/admin/missions` - Create/update missions

## Services

### offerwallService.ts
```typescript
import { fetchOffers, startOffer, getOfferStats } from '@/services/offerwallService'

// Fetch offers
const { offers } = await fetchOffers(userId, { difficulty: 'Easy' })

// Start an offer
const { trackingId, redirectUrl } = await startOffer(userId, offerId)

// Get stats
const stats = await getOfferStats(userId)
```

### surveyService.ts
```typescript
import { fetchSurveys, updateSurveyStatus } from '@/services/surveyService'

// Fetch surveys
const { surveys } = await fetchSurveys(userId)

// Mark complete
await updateSurveyStatus(userId, surveyId, 'completed')
```

### missionService.ts
```typescript
import { 
  fetchMissions, 
  updateMissionProgress, 
  trackAffiliateClick,
  getAffiliateDisclosure 
} from '@/services/missionService'

// Fetch missions
const { missions } = await fetchMissions(userId)

// Track affiliate click (for compliance)
await trackAffiliateClick(userId, missionId, affiliateUrl)

// Get disclosure text
const disclosure = getAffiliateDisclosure('referral')
```

## External Provider Integration

### Adding a New Offerwall Provider

1. **Create Provider Class** in `src/services/providers/offerwallProviders.ts`:
```typescript
export class NewProvider implements IOfferwallProvider {
  readonly name: OfferProvider = 'NewProvider'
  
  async initialize(config: ProviderInitConfig): Promise<void> {
    // Set up SDK keys
  }
  
  async fetchOffers(userId: string): Promise<Offer[]> {
    // Fetch from provider API
  }
  
  getTrackingUrl(offerId: string, userId: string): string {
    // Generate tracking URL
  }
  
  validateCallback(payload: any, signature?: string): boolean {
    // Verify postback signature
  }
}
```

2. **Add Environment Variables**:
```env
NEWPROVIDER_APP_ID=your-app-id
NEWPROVIDER_API_KEY=your-api-key
NEWPROVIDER_POSTBACK_SECRET=your-secret
```

3. **Configure Postback URL** in provider dashboard:
```
https://your-domain.com/api/offers/callback?provider=NewProvider&tid={TRACKING_ID}&uid={USER_ID}&payout={PAYOUT}&trans_id={TRANSACTION_ID}&signature={SIGNATURE}
```

4. **Update Callback Handler** in `src/pages/api/offers/callback.ts` to parse provider-specific payloads.

### Supported Providers

| Provider | Status | Notes |
|----------|--------|-------|
| AdGem | Template Ready | Game offers |
| Tapjoy | Template Ready | Native SDK |
| CPX Research | Template Ready | Surveys |
| OfferToro | Template Ready | Mixed offers |
| AyeT Studios | Template Ready | Mixed offers |
| Pollfish | Template Ready | Surveys |
| TheoremReach | Template Ready | Surveys |
| BitLabs | Template Ready | Surveys |
| Kiwiwall | **Fully Integrated** | Surveys & Offers with global reach |

## Affiliate Compliance

### FTC Compliance Features

The Mission System includes full FTC compliance for affiliate marketing:

1. **Disclosure Dialogs**: Users see affiliate disclosure before clicking any link
2. **Click Tracking**: All affiliate clicks are logged with timestamp, user agent, IP
3. **Consent Recording**: User consent is recorded for compliance documentation
4. **Review Warnings**: Special FTC warning for review missions requiring disclosure

### Compliance Data Logged

```typescript
{
  userId: string
  missionId: string
  affiliateUrl: string
  timestamp: number
  userAgent: string
  ipAddress: string
  country: string
  disclosureShown: true
  consentGiven: true
}
```

### Disclosure Text by Mission Type

| Type | Disclosure |
|------|------------|
| referral | "This is a referral link. We may earn a commission when you sign up." |
| social | "Following, sharing, or engaging with this content may earn you rewards." |
| review | "Honest reviews only. You must disclose that you received compensation." |
| install | "Affiliate link. We may earn a commission if you install and use this app." |

## Auto-Seeding

When the database is empty, default data is automatically seeded:
- 6 default offers
- 5 default surveys  
- 4 default missions

This ensures the app works immediately after deployment.

## Firestore Indexes

Required indexes are defined in `firestore.indexes.json`. Deploy them:
```bash
firebase deploy --only firestore:indexes
```

## Environment Variables

Add these to `.env.local` and `.env.production`:

```env
# Already required
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=your-email
FIREBASE_PRIVATE_KEY=your-key

# Optional: Provider integrations
ADGEM_APP_ID=
ADGEM_API_KEY=
TAPJOY_SDK_KEY=
CPX_APP_ID=
# ... see .env.example for full list
```

## Testing

1. **View Offers**: Navigate to Earn tab → Offerwall
2. **View Surveys**: Navigate to Earn tab → Surveys
3. **View Missions**: Navigate to Earn tab → Missions
4. **Simulate Completion**: Use debug buttons in dev mode
5. **Check Database**: View Firestore console for records

## Next Steps

1. **Admin Panel**: Create admin interface to manage offers/surveys/missions
2. **Provider Integration**: Complete SDK integration for one provider
3. **Real Postbacks**: Set up and test real callback handling
4. **Analytics**: Add dashboards for conversion tracking

---

## Kiwiwall Integration Guide

Kiwiwall is a global offerwall provider with a good mix of surveys and offers. Here's how to set it up:

### Step 1: Create Kiwiwall Account

1. Go to [https://kiwiwall.com/publishers](https://kiwiwall.com/publishers)
2. Sign up for a publisher account
3. Create a new app/placement in your dashboard
4. Note your **App ID** and **Secret Key**

### Step 2: Configure Environment Variables

Add these to your `.env.local` and `.env.production` files:

```env
KIWIWALL_APP_ID=your-app-id
KIWIWALL_SECRET_KEY=your-secret-key
```

### Step 3: Configure Postback URL in Kiwiwall Dashboard

In your Kiwiwall publisher dashboard, set the postback URL to:

```
https://your-domain.com/api/offers/callback?provider=Kiwiwall&status={status}&trans_id={trans_id}&sub_id={sub_id}&amount={amount}&offer_id={offer_id}&offer_name={offer_name}&signature={signature}&ip_address={ip_address}
```

**Available Parameters:**
| Parameter | Description |
|-----------|-------------|
| `{status}` | 1 = success, 2 = reversal/chargeback |
| `{trans_id}` | Unique transaction ID |
| `{sub_id}` | Your user ID (passed when opening offerwall) |
| `{sub_id_2}` - `{sub_id_5}` | Additional tracking parameters |
| `{amount}` | Points/payout in your configured rate |
| `{gross}` | Gross payout in dollars |
| `{offer_id}` | Kiwiwall's offer ID |
| `{offer_name}` | Name of completed offer |
| `{category}` | Category (Offer, Mobile, CC, Video) |
| `{os}` | Operating system (android/ios) |
| `{signature}` | MD5 hash for verification |
| `{ip_address}` | User's IP address |

### Step 4: Whitelist Kiwiwall's IP

Kiwiwall sends postbacks from a single IP address. For security, you should whitelist:

```
34.193.235.172
```

### Step 5: Signature Verification

Kiwiwall signs all postbacks using MD5:

```
signature = MD5(sub_id:amount:secret_key)
```

The integration automatically validates this signature using your `KIWIWALL_SECRET_KEY`.

### Step 6: Display the Offerwall

Use the Kiwiwall wall URL in your frontend:

```typescript
const kiwiwallUrl = `https://www.kiwiwall.com/wall/${KIWIWALL_APP_ID}?sub_id=${userId}`
```

Or use the provider helper:

```typescript
import { KiwiwallProvider } from '@/services/providers/offerwallProviders'

const kiwiwall = new KiwiwallProvider()
await kiwiwall.initialize({ appId: process.env.KIWIWALL_APP_ID })
const url = kiwiwall.getTrackingUrl('', userId)
```

### Testing Your Integration

1. Open your offerwall with a test user ID
2. Complete a test offer (Kiwiwall provides test offers in sandbox mode)
3. Check your server logs for the postback
4. Verify the user's points were credited in Firestore
