// Test email sending
const nodemailer = require('nodemailer')

async function testEmail() {
    console.log('Testing email configuration...')
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST)
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT)
    console.log('EMAIL_USER:', process.env.EMAIL_USER)
    console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0)
    console.log('EMAIL_PASS (last 4):', process.env.EMAIL_PASS ? '****' + process.env.EMAIL_PASS.slice(-4) : 'NOT SET')

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('ERROR: EMAIL_USER or EMAIL_PASS not configured!')
        return
    }

    // Try port 465 (SSL) first, then 587 (TLS)
    const configs = [
        { port: 465, secure: true, name: 'SSL (465)' },
        { port: 587, secure: false, name: 'TLS (587)' },
    ]

    for (const config of configs) {
        console.log(`\n--- Trying ${config.name} ---`)

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: config.port,
            secure: config.secure,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 15000,
        })

        try {
            console.log('Verifying SMTP connection...')
            await transporter.verify()
            console.log('✅ SMTP connection successful!')

            console.log('Sending test email...')
            const info = await transporter.sendMail({
                from: `"KojoMoney" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: 'Test Email from KojoMoney',
                text: 'If you receive this, email sending is working!',
                html: '<h1>Test Email</h1><p>If you receive this, email sending is working!</p>',
            })

            console.log('✅ Email sent successfully!')
            console.log('Message ID:', info.messageId)
            console.log('\n✅ Working configuration:')
            console.log('  EMAIL_PORT=' + config.port)
            console.log('  EMAIL_SECURE=' + config.secure)
            return // Success, exit
        } catch (error) {
            console.error('❌ Failed:', error.message)
        }
    }

    console.log('\n❌ Both configurations failed.')
    console.log('\nPossible issues:')
    console.log('1. Your network/firewall is blocking SMTP ports')
    console.log('2. The app password is incorrect (should be 16 chars, no spaces)')
    console.log('3. 2-Step Verification is not enabled on your Google account')
    console.log('\nCurrent password length:', process.env.EMAIL_PASS?.length || 0, '(should be 16)')
}

// Load env variables
require('dotenv').config({ path: '.env.local' })
testEmail()
