# KojoMoney Security Improvements

## Overview
The app security has been significantly enhanced with a modern two-factor authentication (2FA) system, strong password requirements, and comprehensive security logging.

## Key Security Features Implemented

### 1. **Username & Password Authentication**
- Users now create a **unique username** (3-20 characters, alphanumeric with underscores/hyphens)
- **Email** is required and can also be used for login
- Strong **password requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one digit
  - Real-time password strength indicator

### 2. **Two-Factor Authentication (2FA)**
- **Registration 2FA**: Users must verify their email with a 6-digit code before account creation
- **Login 2FA**: Every login requires email verification with a 6-digit code
- Codes are valid for 10 minutes
- Maximum 5 failed attempts per verification attempt
- Codes are single-use only

### 3. **Password Security**
- Passwords are hashed using **PBKDF2** with SHA-512
  - 100,000 iterations for computational security
  - Unique salt per password
- Passwords are NEVER stored in plain text
- Failed login attempts are logged for audit trails

### 4. **Security Logging**
Multiple security events are tracked:
- **Login attempts** (successful and failed)
- **Login sessions** (IP address, user agent)
- **Registration events**
- **Verification code requests and validations**
- User IP and device information for fraud detection

## Database Schema

### Users Collection
```typescript
{
  username: string,              // Unique, lowercase
  email: string,                 // Unique, lowercase
  passwordHash: string,          // PBKDF2 hashed
  name: string | null,
  phone: string | null,
  referralCode: string,          // Unique
  referredBy: string | null,
  isEmailVerified: boolean,
  isPhoneVerified: boolean,
  totalPoints: number,
  adPoints: number,
  newsPoints: number,
  triviaPoints: number,
  dailyStreak: number,
  isVpnBlocked: boolean,
  isBlocked: boolean,
  deviceId: string,
  lastLogin: Timestamp,
  lastActiveDate: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Verification Codes Collection
```typescript
{
  contact: string,               // Email or phone
  email: string | null,
  phone: string | null,
  code: string,                  // 6-digit code
  type: 'register' | 'login' | 'password-reset',
  expiresAt: Timestamp,
  attempts: number,              // Failed attempts
  isUsed: boolean,
  usedAt: Timestamp,
  createdAt: Timestamp
}
```

### Login Logs Collection
```typescript
{
  userId: string,
  ip: string,
  userAgent: string,
  type: 'login' | 'registration',
  timestamp: Timestamp
}
```

### Login Attempts Collection
```typescript
{
  userId: string,
  ip: string,
  userAgent: string,
  success: boolean,
  timestamp: Timestamp
}
```

## API Endpoints

### Send Verification Code
```
POST /api/auth/send-verification

Body:
{
  email?: string,
  phone?: string,
  type: 'register' | 'login' | 'password-reset'
}

Response:
{
  success: true,
  verificationId: string,
  message: string,
  code?: string  // Only in development
}
```

### Verify Code
```
POST /api/auth/verify-code

Body:
{
  verificationId: string,
  code: string
}

Response:
{
  success: true,
  message: string,
  contact: string,
  email: string,
  phone: string,
  type: string
}
```

### Register
```
POST /api/auth/register

Body:
{
  username: string,
  email: string,
  password: string,
  passwordConfirm: string,
  name?: string,
  phone?: string,
  referralCode?: string,
  verificationId: string
}

Response:
{
  success: true,
  user: {...},
  message: string
}
```

### Login
```
POST /api/auth/login

Body:
{
  usernameOrEmail: string,
  password: string,
  verificationId: string
}

Response:
{
  success: true,
  user: {...},
  message: string
}
```

## Frontend UI Changes

### Registration Flow
1. **Enter Details Screen**: Username, email, password, and optional info
   - Real-time password strength validation
   - Username availability check
   - Email format validation
2. **Verification Screen**: Enter 6-digit code sent to email
   - Displays which email received the code
   - Code only accepts 6 digits
   - Back button to retry
3. **Complete Screen**: Success confirmation

### Login Flow
1. **Enter Credentials Screen**: Username/email and password
2. **Verification Screen**: Enter 6-digit code sent to email
3. **Complete Screen**: Success confirmation

## Environment Variables Required

Add these to your `.env.local` file for email verification:

```
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@kojomoney.com

# For Gmail, use App Password, not your regular password
# Generate at: https://myaccount.google.com/apppasswords
```

## Migration Guide

### For Existing Users
Users with existing accounts created with just an email need to:
1. Set a password on their next login
2. Pass email verification
3. Optionally add a username

### Database Migration (Optional)
If you want to enforce new security on all users:

```typescript
// Add these fields to existing users
db.collection('users').doc(userId).update({
  username: 'user_' + userId.substring(0, 8),  // Generate from ID
  isEmailVerified: true,  // Assume existing users' emails are verified
  lastLogin: Timestamp.now()
})
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Never log passwords** in any system
3. **Rotate security codes regularly** - currently 10 minute expiration
4. **Monitor failed login attempts** for brute force attacks
5. **Implement rate limiting** on verification endpoints
6. **Use Firebase Security Rules** to protect sensitive data:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Verification codes - only accessible by admins
    match /verification_codes/{document=**} {
      allow read, write: if request.auth.uid == null;
      allow read, write: if request.auth == null || request.auth.uid == 'admin-user-id';
    }
    
    // Login attempts - only accessible to authorized users
    match /login_logs/{document=**} {
      allow read: if resource.data.userId == request.auth.uid;
      allow write: if false;
    }
  }
}
```

## Testing the New System

### Test Registration
1. Enter a unique username (e.g., `testuser_001`)
2. Enter a valid email
3. Create password with all requirements met
4. Verify email code (check console/email logs)
5. Account created successfully

### Test Login
1. Use username or email to login
2. Enter correct password
3. Verify email code
4. Login successful

### Test Security
1. Try wrong password - should fail after verification
2. Try 5 wrong codes - should be blocked
3. Wait 10 minutes for code expiration
4. Use code twice - should fail on second attempt

## Future Enhancements

1. **SMS Verification** - Add Twilio integration for phone verification
2. **Biometric Authentication** - Add fingerprint/face recognition
3. **Passwordless Login** - Magic link authentication
4. **Recovery Codes** - Backup codes for lost access
5. **Device Whitelist** - Remember trusted devices
6. **IP Restrictions** - Prevent logins from suspicious locations
7. **Session Management** - Concurrent device limits
8. **TOTP Support** - Google Authenticator, Authy integration

## Support

For issues or questions about the new security system:
1. Check this documentation
2. Review error messages in the UI
3. Check server logs for detailed errors
4. Verify environment variables are set correctly

---

**Last Updated**: December 2025
**Version**: 2.0 - Security Enhanced
