import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.1b783889c4604e52a4bd950110dc395b",
  appName: "aetheristechnology",
  webDir: "dist",
  server: {
    url: "https://1b783889-c460-4e52-a4bd-950110dc395b.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
