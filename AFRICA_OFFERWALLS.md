# Africa-Focused Offerwall & Survey Integration

## Overview

This document describes the integration of Africa-friendly offerwall and survey providers for KojoMoney. 

**IMPORTANT: Offerwalls and Surveys are now SEPARATED:**
- **Offerwall feature** → Uses offerwall APIs (games, app installs, sign-ups)
- **Survey feature** → Uses survey APIs (paid market research surveys)

## Integrated Providers

### 1. Wannads
- **Website**: [wannads.com](https://wannads.com)
- **Offerwall API**: `https://platform.wannads.com/api/offerwall/offers` (games, apps)
- **Survey API**: `https://api.wannads.com/api/surveys` (surveys only)
- **African Coverage**: Nigeria, Kenya, Ghana, South Africa, Egypt, and more

### 2. Adgate Media
- **Website**: [adgatemedia.com](https://adgatemedia.com)
- **API**: `https://api.adgatemedia.com/v3/offers` (single API, filter by category)
- **Offerwall**: Filter for games, apps, installs
- **Surveys**: Filter for survey category
- **African Coverage**: Global including African countries

### 3. Monlix
- **Website**: [monlix.com](https://monlix.com)
- **Offerwall API**: `https://api.monlix.com/api/campaigns` (offers, apps)
- **Survey API**: `https://api.monlix.com/api/surveys` (surveys only)
- **African Coverage**: Global with African support

---

## API Endpoints

### Offerwalls (Games, Apps, Installs)

**Endpoint:** `GET /api/offerwalls`

```
GET /api/offerwalls?userId=USER_ID
```

Returns offerwall URLs for games, apps, and installs - **NOT surveys**.

**Response:**
```json
{
  "offerwalls": [
    {
      "provider": "Wannads",
      "name": "Wannads",
      "description": "High-paying tasks with African market coverage",
      "types": ["Game", "Install", "Watch"],
      "bestFor": "App installs & games",
      "url": "https://earn.wannads.com/wall?apiKey=...",
      "available": true
    }
  ],
  "note": "These are OFFERWALLS only. For surveys, use /api/surveywalls"
}
```

### Surveys (Paid Market Research)

**Endpoint:** `GET /api/surveywalls`

```
GET /api/surveywalls?userId=USER_ID
```

Returns survey wall URLs - **ONLY surveys**.

**Response:**
```json
{
  "surveyWalls": [
    {
      "provider": "Wannads",
      "name": "Wannads Surveys",
      "description": "High-paying market research surveys",
      "types": ["Survey"],
      "bestFor": "High-paying surveys",
      "url": "https://earn.wannads.com/survey-wall?...",
      "available": true
    }
  ],
  "note": "These are SURVEYS only. For offerwalls, use /api/offerwalls"
}
```

---

## Setup Instructions

### Step 1: Sign Up with Providers

1. **Wannads**: [wannads.com/publisher](https://wannads.com/publisher)
2. **Adgate Media**: [panel.adgatemedia.com/signup](https://panel.adgatemedia.com/signup)
3. **Monlix**: [publisher.monlix.com](https://publisher.monlix.com)

### Step 2: Configure Environment Variables

Add to `.env.local`:

```env
# Wannads Configuration
WANNADS_APP_ID=your_wannads_app_id
WANNADS_API_KEY=your_wannads_api_key
WANNADS_SECRET_KEY=your_wannads_secret_key

# Adgate Media Configuration
ADGATE_APP_ID=your_adgate_wall_id
ADGATE_API_KEY=your_adgate_api_key
ADGATE_SECRET_KEY=your_adgate_postback_secret

# Monlix Configuration
MONLIX_APP_ID=your_monlix_app_id
MONLIX_API_KEY=your_monlix_api_key
MONLIX_SECRET_KEY=your_monlix_secret_key
```

### Step 3: Configure Postback URLs

Set up postback URLs in each provider's dashboard:

#### Wannads Postback URL:
```
https://your-domain.com/api/offers/callback?provider=Wannads&uid={user_id}&tid={transaction_id}&payout={payout}&oid={offer_id}&sig={signature}
```

#### Adgate Media Postback URL:
```
https://your-domain.com/api/offers/callback?provider=Adgate&s1=[s1]&points=[points]&tx_id=[transaction_id]&offer_id=[offer_id]&signature=[signature]
```

#### Monlix Postback URL:
```
https://your-domain.com/api/offers/callback?provider=Monlix&userid=[user_id]&transid=[trans_id]&payout=[payout]&hash=[hash]
```

---

## File Structure

```
src/
├── services/
│   └── providers/
│       └── africaProviders.ts    # Provider classes with separate:
│                                  # - fetchOffers() for offerwall
│                                  # - fetchSurveys() for surveys
├── pages/api/
│   ├── offerwalls.ts             # Offerwall API (games, apps)
│   ├── surveywalls.ts            # Survey wall API (surveys only)
│   └── offers/
│       └── callback.ts           # Postback handler for all providers
├── components/
│   ├── AfricaOfferwallSystem.tsx # UI for offerwalls (games, apps)
│   ├── SurveySystem.tsx          # UI for surveys
│   └── EarnApp.tsx               # Main app with both features
└── lib/
    └── db-schema.ts              # Provider types
```

---

## How the Separation Works

### Offerwall Feature (Games, Apps, Installs)

```
[User] → [Offerwall Tasks] → /api/offerwalls
                                    ↓
                         [Returns game/app offers]
                                    ↓
                         [User opens offerwall]
                                    ↓
                         [Completes game/app offer]
                                    ↓
                         [Postback] → /api/offers/callback
```

### Survey Feature (Paid Surveys)

```
[User] → [Take Surveys] → /api/surveywalls
                                ↓
                         [Returns survey offers]
                                ↓
                         [User opens survey wall]
                                ↓
                         [Completes survey]
                                ↓
                         [Postback] → /api/offers/callback
```

---

## Provider Methods

Each provider class has TWO fetch methods:

```typescript
class WannadsProvider {
    // For OFFERWALLS (games, apps - NO surveys)
    async fetchOffers(userId: string): Promise<Offer[]>
    
    // For SURVEYS (surveys ONLY)
    async fetchSurveys(userId: string): Promise<Offer[]>
    
    // Offerwall iframe URL (games, apps)
    getOfferwallUrl(userId: string): string
    
    // Survey wall iframe URL (surveys only)
    getSurveyWallUrl(userId: string): string
}
```

---

## Revenue Expectations

| Feature | Provider | Avg Payout | Coverage |
|---------|----------|------------|----------|
| **Offerwalls** | Wannads | $0.50-$5.00 | Africa ✅ |
| **Offerwalls** | Adgate | $0.10-$5.00 | Global ✅ |
| **Offerwalls** | Monlix | $0.20-$3.00 | Global ✅ |
| **Surveys** | Wannads | $0.10-$2.00 | Africa ✅ |
| **Surveys** | Adgate | $0.05-$1.50 | Global ✅ |
| **Surveys** | Monlix | $0.05-$1.00 | Global ✅ |

---

## Troubleshooting

### Surveys showing in Offerwalls (or vice versa)

The provider classes now filter offers by category:
- `fetchOffers()` excludes anything with "survey" in category
- `fetchSurveys()` includes ONLY items with "survey" in category

### API Not Returning Data

1. Check API keys in `.env.local`
2. Restart dev server after adding keys
3. Check provider dashboard for API status

### Postbacks Not Working

1. Ensure app is publicly accessible
2. Check postback URL format matches provider's expected format
3. Verify signature validation settings

---

## Support

For provider-specific issues:
- **Wannads**: support@wannads.com
- **Adgate Media**: support@adgatemedia.com
- **Monlix**: support@monlix.com
