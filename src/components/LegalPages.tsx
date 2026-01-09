'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield, FileText, Cookie, Scale, Mail, Globe } from 'lucide-react'
import { motion } from 'framer-motion'

interface LegalPagesProps {
    onClose: () => void
    initialPage?: 'privacy' | 'terms' | 'cookies' | 'gdpr'
}

export default function LegalPages({ onClose, initialPage = 'privacy' }: LegalPagesProps) {
    const [activePage, setActivePage] = useState<'privacy' | 'terms' | 'cookies' | 'gdpr'>(initialPage)

    const pages = [
        { id: 'privacy' as const, title: 'Privacy Policy', icon: Shield },
        { id: 'terms' as const, title: 'Terms of Service', icon: FileText },
        { id: 'cookies' as const, title: 'Cookie Policy', icon: Cookie },
        { id: 'gdpr' as const, title: 'GDPR & Data Rights', icon: Scale },
    ]

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-950 border-b sticky top-0 z-20">
                <div className="p-4 flex items-center space-x-3">
                    <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Legal Information</h1>
                </div>

                {/* Tab Navigation */}
                <div className="flex overflow-x-auto px-4 pb-3 gap-2">
                    {pages.map((page) => (
                        <Button
                            key={page.id}
                            variant={activePage === page.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActivePage(page.id)}
                            className="whitespace-nowrap"
                        >
                            <page.icon className="h-4 w-4 mr-1" />
                            {page.title}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="p-4 max-w-3xl mx-auto pb-20">
                <motion.div
                    key={activePage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {activePage === 'privacy' && <PrivacyPolicy />}
                    {activePage === 'terms' && <TermsOfService />}
                    {activePage === 'cookies' && <CookiePolicy />}
                    {activePage === 'gdpr' && <GDPRRights />}
                </motion.div>

                {/* Contact Section */}
                <Card className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-6 w-6 text-blue-500" />
                            <div>
                                <p className="font-semibold">Questions or Concerns?</p>
                                <p className="text-sm text-muted-foreground">
                                    Contact us at <a href="mailto:admin@kojomoney.com" className="text-blue-600 hover:underline">admin@kojomoney.com</a>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function PrivacyPolicy() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Privacy Policy</h2>
                <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                    <Globe className="h-4 w-4" />
                    <span>This policy applies globally to all KojoMoney users worldwide</span>
                </div>
                <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                    <p className="font-semibold">Developer Information:</p>
                    <p className="text-muted-foreground mt-1">
                        Developer: [Your Name or Company Name]<br />
                        Location: [Your Country/Region]<br />
                        Email: admin@kojomoney.com<br />
                        Package: com.kojomoney.app
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                        You can register as an individual or organization developer.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">1. Information We Collect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <h4 className="font-semibold mb-2">Personal Information</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Email address (for account creation and communication)</li>
                            <li>Username (for identification within the app)</li>
                            <li>Phone number (optional, for withdrawals)</li>
                            <li>Payment information (for processing withdrawals)</li>
                            <li>Timezone and location data (for personalized experience)</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Usage Information</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Device information (device type, operating system)</li>
                            <li>IP address and approximate location</li>
                            <li>App usage data (features used, time spent)</li>
                            <li>Advertising identifiers (for personalized ads)</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">2. How We Use Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>We use the information we collect to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Provide and maintain our services globally</li>
                        <li>Process your earnings and withdrawals in your local currency</li>
                        <li>Send notifications about your account and earnings (respecting your timezone)</li>
                        <li>Improve our app and develop new features</li>
                        <li>Prevent fraud and ensure security</li>
                        <li>Display personalized advertisements</li>
                        <li>Comply with legal obligations in various jurisdictions</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">3. Third-Party Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <p className="text-muted-foreground">We work with third-party partners globally to provide our services:</p>
                    <div>
                        <h4 className="font-semibold mb-2">Advertising Partners</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Google AdMob - for displaying advertisements</li>
                            <li>Meta Audience Network - for ad mediation</li>
                            <li>Unity Ads, AppLovin - for rewarded videos</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Survey & Offerwall Partners</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Lootably, Torox - for global offerwall services</li>
                            <li>CPX Research, Pollfish - for worldwide survey opportunities</li>
                            <li>Wannads, Adgate, Monlix - for regional offers</li>
                            <li>These partners have their own privacy policies</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Analytics & Infrastructure</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Firebase - for authentication and analytics</li>
                            <li>Google Analytics - for usage analytics</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">4. International Data Transfers</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>As a global service, your data may be transferred to and processed in countries other than your country of residence, including the United States. We ensure appropriate safeguards are in place for international transfers, including Standard Contractual Clauses where required by law.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">5. Data Retention</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>We retain your personal information for as long as your account is active or as needed to provide services. Financial records are kept for 7 years for legal compliance. You can request deletion of your account at any time.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">6. Your Rights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>Depending on your location, you may have the right to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Access your personal data</li>
                        <li>Correct inaccurate data</li>
                        <li>Request deletion of your data</li>
                        <li>Object to data processing</li>
                        <li>Data portability</li>
                        <li>Withdraw consent at any time</li>
                        <li>Lodge a complaint with your local data protection authority</li>
                    </ul>
                    <p className="mt-2 text-xs">Rights may vary based on your jurisdiction. EU/EEA residents have additional rights under GDPR. California residents have rights under CCPA.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">7. Children's Privacy</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>KojoMoney is not intended for children under 18 (or the age of majority in your jurisdiction). We do not knowingly collect personal information from minors. If we learn we have collected information from a minor, we will delete it immediately.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">8. Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>We implement industry-standard security measures to protect your information:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li><strong>Data Encryption:</strong> All data transmitted between your device and our servers is encrypted using TLS/SSL protocols</li>
                        <li><strong>Secure Storage:</strong> Personal data is encrypted at rest using industry-standard encryption</li>
                        <li><strong>Authentication:</strong> We use Firebase Authentication with secure password hashing</li>
                        <li><strong>Regular Audits:</strong> Our security practices are regularly reviewed and updated</li>
                        <li><strong>Access Controls:</strong> Strict access controls limit who can access user data</li>
                    </ul>
                    <p className="mt-3">However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee absolute security.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">9. Data Deletion</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>You can request deletion of your account and all associated data at any time:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>Email us at admin@kojomoney.com with "Account Deletion Request" as the subject</li>
                        <li>Or use the "Delete Account" option in app settings</li>
                        <li>We will process your request within 30 days</li>
                        <li>Some data may be retained for legal compliance (e.g., financial records for 7 years)</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">10. Contact Us</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>For privacy-related questions, contact us at:</p>
                    <p className="mt-2">
                        <strong>Email:</strong> admin@kojomoney.com<br />
                        <strong>Data Protection Officer:</strong> admin@kojomoney.com
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

function TermsOfService() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Terms of Service</h2>
                <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                    <Globe className="h-4 w-4" />
                    <span>These terms apply to all users worldwide</span>
                </div>
                <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                    <p className="font-semibold">Developer Information:</p>
                    <p className="text-muted-foreground mt-1">
                        Developer: [Your Name or Company Name]<br />
                        Location: [Your Country/Region]<br />
                        Email: admin@kojomoney.com<br />
                        Package: com.kojomoney.app
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">1. Acceptance of Terms</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>By downloading, accessing, or using KojoMoney, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our services. These terms apply globally to all users regardless of location.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">2. Eligibility</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>To use KojoMoney, you must:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Be at least 18 years old (or the age of majority in your jurisdiction)</li>
                        <li>Have a valid email address</li>
                        <li>Be located in a country where our services are available</li>
                        <li>Not have been previously banned from our platform</li>
                        <li>Have legal capacity to enter into a binding agreement</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">3. Service Availability</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>KojoMoney is available globally, but certain features, offers, and withdrawal methods may vary by region. We strive to provide services worldwide but cannot guarantee availability of all features in all countries due to local regulations or partner restrictions.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">4. Account Responsibilities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>You are responsible for:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Maintaining the confidentiality of your account</li>
                        <li>All activities that occur under your account</li>
                        <li>Providing accurate and truthful information</li>
                        <li>Notifying us of any unauthorized access</li>
                    </ul>
                    <p className="mt-2 font-medium">One account per person. Multiple accounts will result in permanent ban and forfeiture of earnings.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">5. Earning Points</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>You can earn points through:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Watching rewarded video advertisements</li>
                        <li>Reading news articles</li>
                        <li>Completing daily trivia</li>
                        <li>Completing surveys and offers</li>
                        <li>Referring friends</li>
                        <li>Participating in tournaments and challenges</li>
                    </ul>
                    <p className="mt-2">Points have no cash value until redeemed. We reserve the right to adjust point values at any time. Happy Hour bonuses and multipliers are applied based on your local timezone.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">6. Loyalty Program & Rewards Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">Point System:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Points are awarded for completing activities within the app</li>
                        <li>Points have no inherent cash value and cannot be sold or transferred</li>
                        <li>Approximate conversion rate varies by region and payment method</li>
                        <li>Rewards are supplementary to the app's core functionality</li>
                        <li>We reserve the right to adjust point values and reward offerings</li>
                        <li>Points may expire after periods of account inactivity (6+ months)</li>
                    </ul>
                    <p className="font-semibold text-foreground mt-3">Withdrawals & Redemption:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Minimum withdrawal thresholds vary by country and payment method</li>
                        <li>Withdrawals are processed in your local currency where available</li>
                        <li>Processing time: 1-5 business days depending on payment method</li>
                        <li>You must verify your identity before first withdrawal</li>
                        <li>We reserve the right to investigate suspicious activity</li>
                        <li>Fraudulent earnings will be forfeited</li>
                        <li>Exchange rates are determined at time of withdrawal</li>
                        <li>Points cannot be redeemed for cash directly, only for available rewards</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">7. Prohibited Activities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>The following are strictly prohibited:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Using bots, scripts, or automated tools</li>
                        <li>Creating multiple accounts</li>
                        <li>Providing false information on surveys/offers</li>
                        <li>VPN or proxy usage to bypass geographic restrictions</li>
                        <li>Manipulating the referral system</li>
                        <li>Reselling or transferring accounts</li>
                        <li>Any form of fraud or abuse</li>
                        <li>Circumventing security measures</li>
                    </ul>
                    <p className="mt-2 font-medium text-red-600 dark:text-red-400">Violation will result in immediate account termination and forfeiture of all earnings.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">8. Third-Party Services</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>Our app includes third-party services (surveys, offerwalls, ads). These services have their own terms and conditions. We are not responsible for their content or practices. Completing offers does not guarantee rewards if the offer provider rejects your completion.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">9. Limitation of Liability</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>KojoMoney is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages. Our maximum liability is limited to the amount you have earned and not yet withdrawn. Some jurisdictions do not allow limitation of liability, so this may not apply to you.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">10. Changes to Terms</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>We may update these terms at any time. Continued use of the app after changes constitutes acceptance. We will notify users of significant changes via email or in-app notification.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">11. Termination</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>We may suspend or terminate your account at any time for violation of these terms. You may delete your account at any time through the app settings. Upon termination, you forfeit any unredeemed points.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">12. Governing Law & Disputes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>These terms are governed by international commercial law. Any disputes shall be resolved through binding arbitration. For EU consumers, this does not affect your rights under mandatory consumer protection laws in your country of residence.</p>
                </CardContent>
            </Card>
        </div>
    )
}

function CookiePolicy() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Cookie Policy</h2>
                <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                    <Globe className="h-4 w-4" />
                    <span>This policy applies to users worldwide</span>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">What Are Cookies?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>Cookies are small text files stored on your device when you use our app or website. They help us provide a better experience by remembering your preferences, including timezone settings and language preferences.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Types of Cookies We Use</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <h4 className="font-semibold mb-2">Essential Cookies</h4>
                        <p className="text-muted-foreground">Required for the app to function. These include authentication cookies, security tokens, and timezone detection.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Analytics Cookies</h4>
                        <p className="text-muted-foreground">Help us understand how users interact with our app globally. We use Firebase Analytics and similar tools.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Advertising Cookies</h4>
                        <p className="text-muted-foreground">Used by our advertising partners (AdMob, Meta, etc.) to serve personalized ads and measure ad effectiveness across regions.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Third-Party Cookies</h4>
                        <p className="text-muted-foreground">Set by our partners (survey providers, offerwalls) when you interact with their content. These partners operate globally.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Managing Cookies</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>You can manage cookie preferences through your device settings. Note that disabling certain cookies may affect app functionality, including timezone detection and personalized content. For mobile apps, you can reset your advertising identifier in device settings.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Advertising Identifiers</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>On mobile devices, we may use advertising identifiers (IDFA on iOS, GAID on Android) to serve relevant ads. You can opt out of personalized advertising in your device settings:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>iOS:</strong> Settings → Privacy → Tracking</li>
                        <li><strong>Android:</strong> Settings → Google → Ads → Opt out of personalized ads</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Regional Compliance</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>We comply with cookie consent requirements in various jurisdictions including GDPR (EU/EEA), CCPA (California), and other applicable privacy laws. Consent mechanisms may vary based on your location.</p>
                </CardContent>
            </Card>
        </div>
    )
}

function GDPRRights() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Data Protection Rights</h2>
                <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                    <Globe className="h-4 w-4" />
                    <span>We respect data rights globally - GDPR, CCPA, and more</span>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Your Data Rights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <p className="text-muted-foreground">Depending on your location, you may have the following rights:</p>
                    <div>
                        <h4 className="font-semibold mb-1">Right to Access</h4>
                        <p className="text-muted-foreground">You can request a copy of all personal data we hold about you.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Right to Rectification</h4>
                        <p className="text-muted-foreground">You can request correction of inaccurate personal data.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Right to Erasure ("Right to be Forgotten")</h4>
                        <p className="text-muted-foreground">You can request deletion of your personal data, subject to legal retention requirements.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Right to Restrict Processing</h4>
                        <p className="text-muted-foreground">You can request that we limit how we use your data.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Right to Data Portability</h4>
                        <p className="text-muted-foreground">You can request your data in a machine-readable format.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Right to Object</h4>
                        <p className="text-muted-foreground">You can object to processing of your data for marketing purposes.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Right to Non-Discrimination (CCPA)</h4>
                        <p className="text-muted-foreground">California residents: We will not discriminate against you for exercising your privacy rights.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">How to Exercise Your Rights</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>To exercise any of these rights, contact us at:</p>
                    <p className="mt-2">
                        <strong>Email:</strong> admin@kojomoney.com<br />
                        <strong>Subject:</strong> Data Rights Request - [Your Request Type]
                    </p>
                    <p className="mt-2">We will respond within 30 days (or sooner if required by your local law). You may be asked to verify your identity.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Legal Basis for Processing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>We process your data based on:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Contract:</strong> To provide our services to you</li>
                        <li><strong>Consent:</strong> For marketing and personalized ads</li>
                        <li><strong>Legitimate Interest:</strong> For fraud prevention and security</li>
                        <li><strong>Legal Obligation:</strong> For financial record keeping</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">International Data Transfers</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>Your data may be transferred to and processed in countries outside your location, including the United States. We ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) for EU data transfers and other mechanisms as required by applicable law.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Regional Privacy Rights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <h4 className="font-semibold mb-1">EU/EEA Residents (GDPR)</h4>
                        <p className="text-muted-foreground">You have the full rights listed above. You can lodge a complaint with your local Data Protection Authority.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">California Residents (CCPA/CPRA)</h4>
                        <p className="text-muted-foreground">You have rights to know, delete, correct, and opt-out of sale/sharing of personal information.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Brazilian Residents (LGPD)</h4>
                        <p className="text-muted-foreground">You have rights under Brazil's General Data Protection Law.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Other Jurisdictions</h4>
                        <p className="text-muted-foreground">We comply with applicable data protection laws in your jurisdiction.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Data Protection Officer</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>For data protection inquiries, contact our Data Protection Officer:</p>
                    <p className="mt-2">
                        <strong>Email:</strong> admin@kojomoney.com
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Complaints</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p>If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority (such as the ICO in the UK, CNIL in France, or your state Attorney General in the US).</p>
                </CardContent>
            </Card>
        </div>
    )
}
