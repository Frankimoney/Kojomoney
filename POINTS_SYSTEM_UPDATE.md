# Points System Update - Summary

## Changes Made

### 1. Fixed Points Not Updating Issue
**Problem**: Points earned from reading stories were not updating in the wallet and home screen.

**Root Cause**: The app uses two different authentication systems:
- `EarnApp` uses custom `AuthSystem` (stores user in localStorage)
- `NewsReadingSystem` uses `next-auth` session
- When a user is logged in via custom auth but not via next-auth, the quiz submission was updating an anonymous user document instead of the actual user document.

**Solution**:
- Modified `src/app/api/news/route.ts` to accept `userId` from request body
- Modified `src/components/NewsReadingSystem.tsx` to accept and send `userId` prop
- Modified `src/components/EarnApp.tsx` to pass `user.id` to `NewsReadingSystem`
- Added event listeners in `EarnApp` for `kojo:points:earned` and `kojo:user:update` events
- Added 500ms delay before syncing to ensure backend consistency

### 2. Updated Story Points from 5 to 10
**Changes**:
- Updated default points in `src/app/api/news/route.ts` from 5 to 10
- Updated `src/components/NewsReadingSystem.tsx` to explicitly request 10 points
- Created admin API endpoint `src/app/api/admin/update-story-points/route.ts` to bulk update existing stories
- Created script `scripts/update-story-points.js` to run the update
- Successfully updated 58 existing stories in Firestore to 10 points

### 3. Made Streak Bonus Dynamic
**Problem**: The Special Offers section showed hardcoded "100%" progress for streak bonus.

**Solution**:
- Updated `src/components/EarnApp.tsx` to calculate streak progress dynamically: `(user.dailyStreak / 7) * 100`
- Shows actual progress like "2/7 days - 100 bonus points at 7 days"
- Shows celebration message when 7-day streak is achieved

### 4. Removed Duplicate Points Display
**Change**: Removed the points badge from the top header since points are already displayed in the hero section of the home screen.

## Files Modified
1. `src/app/api/news/route.ts` - Accept userId from body, default points to 10
2. `src/components/NewsReadingSystem.tsx` - Accept userId prop, request 10 points
3. `src/components/EarnApp.tsx` - Pass userId, listen for events, dynamic streak, remove duplicate badge

## Files Created
1. `src/app/api/admin/update-story-points/route.ts` - Admin endpoint to bulk update story points
2. `scripts/update-story-points.js` - Script to update existing stories

## Testing Steps
1. ✅ Read a news story and answer the quiz correctly
2. ✅ Verify points update in real-time (within 500ms)
3. ✅ Check wallet tab shows updated points
4. ✅ Check home screen shows updated points
5. ✅ Verify story cards show "10 pts" instead of "5 pts"
6. ✅ Verify streak bonus shows actual progress (e.g., "2/7 days")

## Notes
- The 500ms delay in event listener ensures Firestore write consistency
- All new stories will automatically have 10 points
- The admin endpoint uses a simple secret (`admin-earnapp-2024`) - consider moving to environment variable for production
