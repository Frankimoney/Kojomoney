import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kojomoney.app',
  appName: 'Kojomoney',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // For production: https://kojomoney-6e131.web.app (Firebase Hosting)
    // Mobile app will call API routes from the same domain
    // Note: API routes require a backend server (Cloud Functions on Blaze plan or external server)
  }
}

export default config
