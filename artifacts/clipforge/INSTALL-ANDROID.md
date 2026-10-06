# HuggingVoice Android preview and install guide

## Build an installable APK from GitHub

The Replit phone preview is for development. To create an APK:

1. Push the **entire workspace root** to a GitHub repository. Do not upload only `artifacts/clipforge`; the app uses the root pnpm workspace and lockfile.
2. Push to `main`, or open **Actions → Build HuggingVoice Android APK → Run workflow** in GitHub.
3. When the workflow completes, download the `huggingvoice-test-apk` artifact and unzip `HuggingVoice-test.apk`.
4. Copy the APK to your Android device and open it. Allow installation from that source if Android asks. You can also use `adb install HuggingVoice-test.apk`.

The workflow generates the native Android project and builds a release-mode APK with JavaScript and assets bundled, so it runs without a development server. It is signed with Expo's generated test key and uses no Expo account, EAS, GitHub secrets, or API keys. It is for testing and sideloading, not a Play Store release.

## Try the app through the Replit phone preview

1. Open the HuggingVoice project in Replit and start the **expo** workflow.
2. Open the phone preview / QR-code option in Replit.
3. Install **Expo Go** from Google Play if it is not already installed.
4. Scan the QR code using the Replit phone-preview flow. If Expo Go asks you to sign in, follow the instructions shown in Replit's phone preview.
5. Grant photo/video or file access only when you choose media inside the editor.
6. Add provider keys under **Settings & privacy**. Keys are saved to device secure storage; never paste them into chat or a project document.

## Current build limitations

- Replit's Expo phone preview does not produce an APK; use the GitHub Actions workflow above.
- Video/audio compositing and rendered MP4/MOV export are not implemented yet. This app currently saves timeline and trim metadata locally and can share generated MP3 files.
- The 30 audio filters and 10-band equalizer are stored as project settings; they are not applied to the audio yet.
- App-open/export ads are not connected yet. They need an ad publisher account, app IDs, a native ads package, disclosures, and verification of the two-ads-per-session rule.
- Direct publishing from the app to TikTok is not connected. A future implementation must use TikTok's current supported sharing flow and the user's own confirmation.
- Google Play release requires a persistent release-signing key or upload key, a signed Android App Bundle, Data safety declarations, public policy links, content ratings, and review. No tool can promise Play Store acceptance.

Before distributing a release, provide a public privacy policy URL and complete Google Play's current policy and Data safety forms for the final SDKs, providers, and ad network actually used.
