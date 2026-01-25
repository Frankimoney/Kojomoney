import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kojomoney.app',
  appName: 'Kojomoney',
  webDir: 'out',
  // Use local hostname to enable proper navigation (instead of file://)
  server: {
    androidScheme: 'https',
    hostname: 'app.kojomoney.local'
  }
}

export default config
