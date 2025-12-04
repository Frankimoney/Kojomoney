import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kojomoney.app',
  appName: 'Kojomoney',
  webDir: 'out',
  server: {
    url: 'https://kojomoney-api.onrender.com',
    androidScheme: 'https',
  }
}

export default config
