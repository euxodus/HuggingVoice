# HuggingVoice

HuggingVoice is an Android-first video-editing and voice studio app built with Expo and React Native. The current build includes local projects, media import, timeline and trim controls, caption styling, provider-based script and speech tools, and on-device API-key storage.

> This is an early build, not a finished CapCut replacement. It can create a test-installable APK, but it does not yet render edited videos. See the limitations below before distributing it.

## Repository structure

This is a pnpm workspace. **Keep and upload the repository root**, not only `artifacts/clipforge`: the lockfile, workspace configuration, and shared packages are at the root.

- App source: `artifacts/clipforge/`
- Android setup guide: `artifacts/clipforge/INSTALL-ANDROID.md`
- GitHub APK workflow: `.github/workflows/android-apk.yml`

## Build an installable APK with GitHub

1. Create an empty GitHub repository.
2. Push the full workspace from this directory, including `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `lib/`, `artifacts/`, and `.github/`.
3. Push to the `main` branch. GitHub Actions builds the APK automatically. You can also start it manually from the repository's **Actions → Build HuggingVoice Android APK → Run workflow** page.
4. Open the completed run, download the `huggingvoice-test-apk` artifact, and unzip it. The installable file is `HuggingVoice-test.apk`.
5. Copy the APK to your Android phone and open it. Android may ask you to allow installation from that source. Alternatively, install it with `adb install HuggingVoice-test.apk`.

The workflow uses Expo prebuild and Gradle directly on GitHub's Android runner. It does not require an Expo account, EAS, GitHub secrets, or provider API keys. The generated `android/` folder is intentionally ignored by Git and recreated by the workflow.

It builds the release variant so JavaScript and assets are bundled in the APK and no development server is needed. Expo's generated test signing key is used; replace this with private release signing before store distribution.

The app ID is currently `com.clipforge.mobile`. Choose your own unique Android package ID in `artifacts/clipforge/app.json` **before** publishing to Google Play; changing it after the first store release creates a different app.

## Build locally

Requirements: Node.js 22, pnpm 10.26.1, Java 17, and Android SDK packages matching React Native's version catalog.

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/clipforge run typecheck
pnpm --filter @workspace/clipforge run android:apk
```

The APK is written to `artifacts/clipforge/android/app/build/outputs/apk/release/app-release.apk`.

## Current limitations

- The APK is a test-signed build, not a Google Play release. Play Store distribution requires a persistent private release-signing key and a signed Android App Bundle, in addition to store disclosures and policy materials.
- Video compositing and rendered MP4/MOV export are not implemented. Timeline trim values and audio effect selections are saved as project settings but are not applied to the output.
- Generated MP3 files can be shared. Android system speech is preview-only.
- Ads and direct TikTok posting are not connected.
- OpenAI, Anthropic, ElevenLabs, and Azure Speech keys are entered in the app and stored on the device. When used, the selected script or prompt is sent directly to that provider.

Google Play approval is not guaranteed. Provide a public privacy-policy URL and complete the store's current data-safety and content-rating forms before any public release.
