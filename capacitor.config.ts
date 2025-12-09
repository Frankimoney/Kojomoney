import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kojomoney.app',
  appName: 'Kojomoney',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://kojomoney-app.onrender.com'
  }
}

export default config
