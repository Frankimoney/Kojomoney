# KojoMoney Enhanced Security - Setup Guide

## What Changed?

Your app now has enterprise-grade security with:

✅ **Username & Password Authentication** - Users create unique usernames  
✅ **Two-Factor Email Verification** - 6-digit codes for registration and login  
✅ **Strong Password Requirements** - Real-time strength checking  
✅ **Secure Password Hashing** - PBKDF2-SHA512 with 100,000 iterations  
✅ **Security Logging** - Track all login attempts and verify code requests  
✅ **Email-based 2FA** - Code sent to email with 10-minute expiration  

## Files Changed/Created

### New Files
- `src/lib/security.ts` - Password hashing, validation, and code generation utilities
- `src/app/api/auth/send-verification/route.ts` - Sends 6-digit verification codes
- `src/app/api/auth/verify-code/route.ts` - Validates verification codes
- `SECURITY_ENHANCEMENTS.md` - Comprehensive security documentation

### Modified Files
- `src/components/AuthSystem.tsx` - Completely redesigned with 2FA UI
- `src/app/api/auth/register/route.ts` - Now requires username, password, and verification
- `src/app/api/auth/login/route.ts` - Now requires password and verification code

## Environment Setup Required

Add these environment variables to your `.env.local`:

```bash
# Email Service (Gmail Example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@kojomoney.com

# Generate Gmail App Password:
# 1. Go to https://myaccount.google.com/apppasswords
# 2. Select Mail and Windows Computer
# 3. Copy the 16-character password
# 4. Paste as SMTP_PASS (remove spaces)
```

## Testing Locally

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Test Registration:**
   - Go to http://localhost:3000
   - Click "Register"
   - Username: `testuser_001`
   - Email: `your-email@example.com`
   - Password: `TestPass123!`
   - Click "Continue to Verification"
   - In development mode, the code appears in console (check browser DevTools or terminal)
   - Enter the 6-digit code

3. **Test Login:**
   - Click "Login"
   - Username/Email: `testuser_001` or your email
   - Password: `TestPass123!`
   - Click "Continue to Verification"
   - Enter the code you receive

## User Journey

### Registration (New Users)
```
1. Enter Username (3-20 chars, alphanumeric)
      ↓
2. Enter Email (must be valid)
      ↓
3. Set Strong Password (8+ chars, mixed case, numbers)
      ↓
4. Confirm Password
      ↓
5. (Optional) Add Name, Phone, Referral Code
      ↓
6. Click "Continue to Verification"
      ↓
7. Receive 6-digit code via email
      ↓
8. Enter code to verify
      ↓
9. Account created & logged in ✅
```

### Login (Existing Users)
```
1. Enter Username or Email
      ↓
2. Enter Password
      ↓
3. Click "Continue to Verification"
      ↓
4. Receive 6-digit code via email
      ↓
5. Enter code to verify
      ↓
6. Logged in ✅
```

## Database Collections Created

### verification_codes
Stores all verification codes with:
- Contact info (email/phone)
- 6-digit code
- Type (register/login/password-reset)
- Expiration time (10 minutes)
- Attempt tracking (max 5 failed)
- Usage status

### login_logs
Tracks all login events:
- User ID
- IP address
- User agent
- Login type (successful/failed)
- Timestamp

### login_attempts
Tracks failed login attempts for security:
- User ID
- IP address
- User agent
- Timestamp

## Migrating Existing Users (Optional)

For old users with only email accounts:

```typescript
// In your migration script or console
const usersRef = firebase.firestore().collection('users');
const snapshot = await usersRef.get();

snapshot.forEach(async (doc) => {
  const userData = doc.data();
  if (!userData.username) {
    await doc.ref.update({
      username: 'user_' + doc.id.substring(0, 8),
      isEmailVerified: true,
      lastLogin: firebase.firestore.Timestamp.now()
    });
  }
});
```

## Password Validation Rules

Your users' passwords must have:
- ✓ Minimum 8 characters
- ✓ At least 1 UPPERCASE letter
- ✓ At least 1 lowercase letter
- ✓ At least 1 number

**Valid Example:** `SecurePass123!`  
**Invalid Examples:**
- `password123` (no uppercase)
- `PASSWORD123` (no lowercase)
- `SecurePass` (no numbers)
- `Pass1` (too short)

## Verification Code Details

### What is a verification code?
A temporary 6-digit code sent to the user's email that proves they own that email address.

### How long is it valid?
- **Valid for 10 minutes** from when it's sent
- **Single-use** only - can't be reused
- **Max 5 attempts** before being blocked

### What happens if they forget the code?
They can request a new one - this invalidates the old code and sends a fresh one.

## Security Best Practices

1. **Always HTTPS in production** - Never send passwords over HTTP
2. **Rate limiting** - Consider limiting verification attempts per IP
3. **Monitor logs** - Watch for suspicious login patterns
4. **Session timeout** - Implement automatic logout after 30 min inactivity
5. **Never share codes** - Tell users never to share their verification codes

## Troubleshooting

### "Failed to send verification code"
- Check SMTP environment variables are set
- Verify Gmail App Password is correct (16 characters, no spaces)
- Check Gmail account allows "Less secure app access" (if using regular password)

### "Invalid verification code"
- Code must be exactly 6 digits
- Code expires after 10 minutes
- Each code can only be used once

### "Username already taken"
- Username already exists (case-insensitive)
- User needs to choose a different username

### "Email already registered"
- Email is already associated with an account
- User can try "Forgot Password" or use different email

## Performance Notes

- Password hashing takes ~1 second (intentional security feature)
- Verification code sending is instant (should be <2 seconds)
- Code validation is instant

## Next Steps

1. ✅ Set up SMTP environment variables
2. ✅ Test registration and login flows
3. ✅ Deploy to your production environment
4. ✅ Communicate security changes to users
5. ⭐ Consider adding SMS verification (future)
6. ⭐ Consider adding biometric auth (future)

## Support & Documentation

For more details, see `SECURITY_ENHANCEMENTS.md` which includes:
- Complete API documentation
- Database schema
- Security logging details
- Future enhancement ideas

---

**Your app is now significantly more secure! 🔐**
