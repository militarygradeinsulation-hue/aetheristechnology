import type { CapacitorConfig } from "@capacitor/cli";

// Production native build for the Android APK that lives in the rep/partner portal.
// `server.url` points at the live published site so the installed APK keeps working
// after the Lovable preview sandbox is torn down. For local hot-reload development,
// temporarily swap server.url to your preview URL, run `npx cap sync`, then revert
// before producing a release APK.
const config: CapacitorConfig = {
  appId: "app.lovable.1b783889c4604e52a4bd950110dc395b",
  appName: "Aetheris Operator",
  webDir: "dist",
  server: {
    url: "https://aetheris.technology",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;

