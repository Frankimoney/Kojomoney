 # KojoMoney - Comprehensive Feature Documentation

## 1. Project Overview
**KojoMoney** is a comprehensive rewards and earnings platform designed to allow users to earn points through various activities such as playing games, completing surveys, watching ads, and referring friends. These points can be redeemed for real-world rewards like cash via bank transfer or mobile airtime.

**Platform Support:**
- **Web**: Next.js (React) application.
- **Mobile**: Android application built with Capacitor.

---

## 2. Authentication & User Management
A secure and robust authentication system handles user identities and security.

### 2.1 Registration & Login
- **Email/Password Auth**: Users register with Username, Email, Password (strong password enforced), Name, and Phone.
- **Verification**: 6-digit OTP sent via email (Nodemailer/Resend) for account verification.
- **Referral Integration**: deep linking support (`kojomoney://signup?ref=CODE`) to auto-apply referral codes during signup.
- **Anonymous Merging**: Converting anonymous guest sessions into full registered accounts without losing progress.

### 2.2 Security
- **Password Strength Meter**: Real-time feedback on password complexity (Length, Uppercase, Lowercase, Number).
- **Session Management**: Secure session handling with local storage and API token validation.
- **Timezone Tracking**: Auto-detection of user timezone for accurate event scheduling (e.g., Happy Hour).

---

## 3. Earning Mechanics
KojoMoney offers a diverse range of earning opportunities to keep users engaged.

### 3.1 Offerwalls & Surveys
- **Integration**: Supports external offerwall providers via a unified interface (`IOfferwallProvider`).
- **Major Providers**:
    - **Kiwiwall**: Global offerwall for games, apps, and offers.
    - **AdGem**: Premium offerwall with high-paying tasks.
    - **Tapjoy**: Mobile-first offerwall (native SDK support).
    - **Timewall**: Micro-tasks, clicks, and surveys.
    - **CPX Research**: Specialized survey provider.
- **Survey Partners**:
    - **BitLabs**: Surveys with high payouts.
    - **TheoremReach**: Quick surveys.
    - **Pollfish**: Daily check-in surveys.
- **Africa Offerwall System**: A specialized UI view focusing on providers best suited for African regions (often wrappers around Wannads/Adgate/Monlix aggregation).
- **Categories**: Games, Surveys, Shopping, Finance, Video, Installs, Social.
- **Filtering**: Users can sort offers by Difficulty (Easy/Medium/Hard) and Payout.

### 3.2 Games & Playtime
- **Providers**:
  - **Gamezop**: H5 Games (Direct reward).
  - **Adjoe**: Playtime rewards (Points per minute of gameplay).
  - **Qureka**: Quiz games (Points per coin earned).
- **Fraud Protection**:
  - Signature verification for provider callbacks (HMAC/MD5).
  - Rate limiting and "Velocity" checks (max credits per minute/hour/day).
  - Suspicious event logging for manual review.

### 3.3 Daily Activities
- **Daily Trivia**: 5-10 question quiz with streak tracking. Users earn bonus points for correct answers and maintaining streaks.
- **News Reading**: Users earn points for reading news stories (RSS feed integrated).
- **Rewarded Video Ads**: Integration with **AdMob** (via Capacitor) for users to watch videos in exchange for points.
- **Daily Challenges**: Checklist of daily tasks (e.g., "Read 3 articles", "Play 1 Game") unlocking a "Bonus Chest".
- **Lucky Spin**: A daily "Wheel of Fortune" style minigame.
- **Happy Hour**: Multiplier events triggering at specific times for increased earnings.

### 3.4 Social Missions
- **Task Types**: Follow social media accounts, leave app reviews, join telegram channels.
- **Verification**: Admin-verified or automated checks.

### 3.5 Tournaments
- **Weekly Cup**: A competitive leaderboard system.
- **Rewards**: Top ranked users share a prize pool.

---

## 4. Referral System
A multi-tiered viral growth engine.

- **Commission**: Users earn **10%** of their referrals' earnings forever.
- **Milestone Bonuses**: One-time bonus points for reaching headcount milestones (e.g., 10, 50, 100 referrals).
- **Weekly Contest**: A recurring contest with a cash prize pool (e.g., $100) for the top 10 inviters of the week.
- **Sharing Tools**:
  - Native Share Sheet (Mobile).
  - Social Links (WhatsApp, Facebook, Twitter).
  - **Poster Generator**: Generates a personalized image with the user's referral code for sharing on statuses/stories.

---

## 5. Wallet & Redemption
Complete financial system for point management and withdrawals.

### 5.1 Currency
- **Points**: The internal currency used for all earning activities.

### 5.2 Withdrawal Methods
- **Bank Transfer (Nigeria)**:
  - Integration with **Paystack** for account name verification.
  - Supports all major Nigerian banks (Access, GTB, Zenith, OPay, PalmPay, etc.).
- **PayPal (Global)**:
  - Global cashout option via PayPal email.
- **Cryptocurrency**:
  - Direct wallet withdrawals (Network + Address).
- **Mobile Top-up (Global)**:
  - Integration with **Reloadly** API.
  - Supports airtime top-ups to 100+ countries.
  - Auto-carrier detection for phone numbers.
- **Gift Cards**: Mechanism for redeeming points for digital brand cards (with recipient email).

### 5.3 Transactions
- **History**: Detailed ledger of all credits (Games, Ads, Referrals) and debits (Withdrawals).
- **Atomic Operations**: Game rewards use Firestore transactions to ensure data integrity (no double-crediting).

---

## 6. Admin & Management
Tools for platform administrators to manage the ecosystem.

- **Dashboard**: Comprehensive view of User stats, Payouts, and Revenue.
- **User Management**: Ability to view user details, adjust balances, and ban suspicious accounts.
- **Mission Control**: Create and edit Social Missions.
- **Activity Feed**: Real-time ticker of user activities ("User X just earned 500 points") for social proof.

---

## 7. Technical Integrations
- **Backend Services**:
  - `walletService`: Transaction management.
  - `offerwallService`: Provider aggregation.
  - `adService`: Ad monetization logic.
  - `notificationService`: Push notifications via Firebase Cloud Messaging (FCM).
- **Libraries**:
  - **Tailwind CSS**: Styling.
  - **Framer Motion**: Animations.
  - **Capacitor**: Mobile native bridge (Camera, Share, Push Notifications).
  - **Firebase**: Firestore (DB), Auth, Analytics, Crashlytics.
  - **TipTap**: Rich text editor for Blog/Content creation.

---

## 8. Legal & Compliance
Ready-to-publish features for Google Play Store compliance.
- **GDPR Compliance**: Dedicated page and consent mechanisms.
- **Privacy Policy & Terms**: Detailed legal documents available in-app.
- **Account Deletion**: Self-serve option for users to request data deletion.
