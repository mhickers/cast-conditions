# Fish Condish — iOS App Store setup

Everything in the code is done (Capacitor config, native helpers, build verified).
These are the steps only you can do on your Mac + Apple account.

## 0. Apply this bundle first
```
cd ~/Downloads
unzip -o cast-conditions-ios-capacitor.zip -d bundle-tmp
rsync -av bundle-tmp/cast-conditions/ cast-conditions/
cd cast-conditions
npm install            # IMPORTANT: pulls the new Capacitor packages
CI=true npm run build  # confirm the web build still passes (it will)
git add . && git commit -m "Add Capacitor iOS shell + native features" && git push
```

## 1. One-time tools (Mac)
- Install **Xcode** from the Mac App Store, then open it once to finish setup.
- Install **CocoaPods**: `sudo gem install cocoapods` (or `brew install cocoapods`).
- Join the **Apple Developer Program** ($99/year) at developer.apple.com — required to ship to the store.

## 2. Generate the iOS project
From the repo root:
```
npx cap add ios       # creates the native ios/ project (run once)
npx cap sync ios       # copies the latest web build + plugins into it
npx cap open ios       # opens the project in Xcode
```
(You already have a capacitor.config.ts, so you can skip `npx cap init`.)
Re-run `npm run build && npx cap sync ios` any time you change the web app.
Tip: there's an npm shortcut — `npm run cap:ios` does build + sync + open in one go.

## 3. Configure in Xcode
- Select the **App** target → **Signing & Capabilities** → check "Automatically manage
  signing" and pick your Apple Developer **Team**. Bundle ID is `com.fishcondish.app`
  (change it in capacitor.config.ts BEFORE `cap add ios` if you want a different one).
- **Info.plist** — add this key or the app will crash when it asks for location and
  Apple will reject it:
  - `NSLocationWhenInUseUsageDescription` = "Fish Condish uses your location to show
    fishing conditions for where you are."
  - (Local notifications need no plist key — the plugin asks at runtime.)
- Add **app icons** (Assets.xcassets → AppIcon). A 1024×1024 PNG is the minimum;
  a tool like appicon.co or Xcode's single-size slot will generate the rest.

## 4. Test
- Pick a simulator (or your iPhone) in Xcode and hit Run.
- Verify: the app loads fishcondish content, "Use my location" prompts for GPS,
  and the new **Remind me** button schedules a dawn notification.

## 5. Submit to the App Store
- In Xcode: Product → Archive → Distribute App → App Store Connect.
- At appstoreconnect.apple.com: create the app listing (name, screenshots,
  description, privacy questionnaire — declare location use + that you don't track),
  attach the build, and submit for review.

## The review gotcha (Guideline 4.2)
Apple rejects "just a website in a wrapper." This build ships native features so it
isn't one: native GPS, on-device local notifications (the Remind me button), haptics,
and a native splash/status bar. In the review notes, point those out explicitly.
The single best thing you could add next for both value and review safety is true
push notifications (server-sent bite alerts) — that needs an APNs key and a small
backend, so it's a good "version 1.1" once this is live.
