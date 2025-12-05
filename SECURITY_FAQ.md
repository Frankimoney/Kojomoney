# Security FAQ - Common Questions & Answers

## Registration & Login

### Q: Why do users need a username now?
**A:** Usernames provide:
- Unique identity separate from email
- Privacy protection (email can change, username is permanent)
- Personalization (users like having a username)
- Better security (harder to guess than email)

### Q: What if a user forgets their password?
**A:** Currently, they can:
1. Register again with a different email
2. Use a referral code to get bonus points again

**Future:** Password reset via email verification code will be added.

### Q: Can users change their username?
**A:** Not yet, but this can be added:
- Username uniqueness check
- Historical tracking
- Potential username transfer cool-down

### Q: How secure is the 6-digit code?
**A:** Very secure because:
- 1 million possible combinations
- Only 5 attempts allowed
- 10-minute time window
- Single use only
- Code never sent in URL, only email

### Q: How long does verification take?
**A:** 
- Email sending: Usually <2 seconds
- User to check email: 30 seconds - 5 minutes
- Total registration: 1-5 minutes

### Q: Can we use SMS instead of email?
**A:** Yes! We can add Twilio integration:
- Phone verification in verification endpoint
- SMS sending capability
- Phone-based 2FA option

## Security

### Q: Is my password stored securely?
**A:** Yes, using:
- PBKDF2-SHA512 hashing
- 100,000 iterations (computational security)
- Unique salt per password
- Passwords never logged or exposed

**NOT stored as:** Plain text, MD5, SHA1 without salt

### Q: What happens if someone gets my verification code?
**A:** Limited damage because:
- Code is single-use (invalid after first use)
- Code expires in 10 minutes
- They still need your username AND password
- Requires physical access to your email
- Failed attempts are logged

### Q: What information is logged?
**A:** For security purposes:
- Login success/failure
- Your IP address (for suspicious activity detection)
- User agent/device info
- Timestamp
- User ID

**NOT logged:** Passwords, verification codes, full requests

### Q: Is my data safe from hackers?
**A:** Multiple layers of protection:
1. Password is hashed (can't decrypt)
2. Verification codes are temporary
3. Failed attempts are blocked
4. Suspicious activity triggers fraud detection
5. Firebase security rules restrict data access
6. HTTPS encryption in transit

### Q: What is "device fingerprinting"?
**A:** We capture:
- Your user agent (browser/device type)
- Your IP address
- Device characteristics

This helps detect:
- Login from unusual location
- Potential account takeover
- Suspicious patterns

## Password Requirements

### Q: Why 8 characters minimum?
**A:** 8 characters:
- Takes ~1 second to guess with PBKDF2
- Strong enough with mixed requirements
- Balances security and usability

### Q: Do I need special characters like !@#$?
**A:** Currently not required, but recommended:
- `SecurePass123` ✅ Valid
- `SecurePass!@#` ✅ Even better

### Q: What if I forget my password strength requirements?
**A:** The UI shows real-time feedback:
- Green bar when strong
- Shows what's missing
- Examples of valid passwords

### Q: Can I use the same password everywhere?
**A:** Not recommended:
- If one site is hacked, all accounts at risk
- Use unique password for each account
- Use password manager (1Password, Bitwarden)

### Q: How do I create a strong password?
**A:** Easy methods:
1. Passphrase: `Coffee5Days!Morning`
2. Random: Use password generator
3. Pattern: Replace letters with numbers: `S3cur3P@ssw0rd`
4. Favorite quote: First letter + numbers

## Verification Codes

### Q: How many times can I try to use the code?
**A:** Maximum 5 attempts, then blocked.

After 5 failed attempts:
- Request a new code
- New code is sent immediately
- Old code becomes invalid

### Q: What if I close the browser before verifying?
**A:** No problem:
- Code remains valid
- You can open email and click verify again
- Code valid for full 10 minutes

### Q: Can I get the code sent again?
**A:** Yes:
- Just request a new verification
- New code is sent immediately
- Previous code is invalidated
- Process takes <2 seconds

### Q: What if I don't receive the code?
**A:** Check:
1. Email spam/junk folder
2. Email address is correct
3. Email service is working
4. Request again (sometimes takes 30 seconds)

If still missing:
- Try different email address
- Contact support

## Existing Users

### Q: What happens to my old account?
**A:** Your existing account:
- Email is same
- Points preserved
- History preserved
- But needs username & password added

### Q: Do I need to migrate immediately?
**A:** No:
- Old email-only logins still work temporarily
- You get warned to set password
- Complete at your own pace

### Q: How do I add username and password to old account?
**A:** Easy:
1. Click "Login" 
2. Enter email (not username yet)
3. System prompts for password creation
4. Set your username
5. Verify email
6. Done!

### Q: Will my referral code work?
**A:** Yes:
- All referral bonuses preserved
- New referral links work
- Existing referrals count

## Mobile App

### Q: Will this work on Android/iOS?
**A:** Yes:
- Email verification works same
- Codes delivered same way
- UI adapted for mobile screens
- Works offline for input, online for submission

### Q: Is it slower on mobile?
**A:** No:
- Same speed as web
- Password hashing same time
- Email sending same time
- Verification instant

### Q: Can we use biometric on mobile?
**A:** Yes, future enhancement:
- Fingerprint after password
- Face recognition option
- Faster repeat logins

## Performance & Reliability

### Q: Why does registration take longer now?
**A:** Due to security hashing:
- Password hashing: ~1 second (intentional)
- Email sending: ~1-2 seconds
- Total: Usually 2-3 seconds
- This is normal for secure systems

### Q: What if email service is down?
**A:** Graceful handling:
- Clear error message
- User can retry immediately
- Code is still generated (can be resent later)
- Doesn't lose data

### Q: Will this slow down the app?
**A:** No:
- Login takes same time
- All operations cached efficiently
- Code verification instant
- Database queries optimized

## Cost & Performance

### Q: What's the cost of sending verification codes?
**A:** Using Gmail:
- Free for your own domain (@gmail.com)
- About $6/month with custom SMTP
- Typically 1000s of emails for pennies with SendGrid

### Q: How many users can this handle?
**A:** Scales to millions:
- Firebase handles unlimited users
- Email service handles millions/day
- No rate limiting by default
- Add rate limiting for scale

## Privacy

### Q: What data do you collect?
**A:** Account data:
- Username, email, phone (optional)
- Password (hashed, not readable)
- Account activity logs
- Device/IP for security

**NOT collected:** Browsing data, personal info beyond account

### Q: Can I delete my account?
**A:** Should be supported:
- Deletes username, email, password
- Keeps earnings history (for audit)
- Clears device data
- Can request complete deletion

### Q: Is my email exposed?
**A:** No:
- Email only stored securely
- Not shown to other users
- Only you and admins can see it
- Never used for spam

## Troubleshooting

### Q: "Username already taken" - what do I do?
**A:** Try:
1. Different username (add numbers: `john_doe_123`)
2. Remember your exact username (case-insensitive)
3. If you created account before, use same username

### Q: "Verification code invalid" - what do I do?
**A:** Check:
1. Copy-paste code (avoid typos)
2. Code must be exactly 6 digits
3. Code expires after 10 minutes
4. Request new code if expired
5. Max 5 attempts, then request new code

### Q: Can't receive verification code
**A:** Try:
1. Check spam folder
2. Verify email address is correct
3. Wait 30 seconds
4. Request new code
5. Check internet connection

### Q: Password keeps getting rejected
**A:** Ensure password has:
- ✓ At least 8 characters
- ✓ At least 1 UPPERCASE (A-Z)
- ✓ At least 1 lowercase (a-z)
- ✓ At least 1 number (0-9)

Example: `SecurePass123`

## Advanced Questions

### Q: How do you prevent brute force attacks?
**A:** Multiple protections:
1. Max 5 attempts per verification code
2. Fraud detection on multiple failed logins
3. IP-based rate limiting
4. Account lockout after suspicious activity
5. Device fingerprinting

### Q: What happens if someone compromises my email?
**A:** They would need:
1. Your email account
2. Your username
3. Your password
4. Your verification code

We recommend:
- Enable 2FA on your email account
- Strong email password
- Review login activity regularly

### Q: Can I use the API directly?
**A:** Yes, endpoints available:
- `/api/auth/send-verification`
- `/api/auth/verify-code`
- `/api/auth/register`
- `/api/auth/login`

Full documentation in `SECURITY_ENHANCEMENTS.md`

### Q: How do I integrate with third-party auth?
**A:** Can add later:
- Google Sign-In
- Facebook Login
- Apple ID
- Twitter

Would co-exist with current system.

## Getting Help

### I have a security concern
- Document the issue
- Send to security@kojomoney.com
- Don't post publicly
- We'll investigate immediately

### I forgot my password
- Use "Forgot Password" (when implemented)
- Or use "Login with Google" (when available)
- Or register with different email

### I didn't receive verification code
- Check spam folder
- Verify email is correct
- Request new code
- Try different email if needed

### Report a vulnerability
- Don't test on live users
- Contact security team
- Follow responsible disclosure
- Get credit in security page

---

**Last Updated:** December 2025  
**Questions?** Check SECURITY_ENHANCEMENTS.md for technical details
