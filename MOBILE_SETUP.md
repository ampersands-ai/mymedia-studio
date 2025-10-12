# 📱 Mobile App Setup Guide

Complete guide for building and deploying Artifio Create as a native iOS and Android application.

---

## Prerequisites

### General Requirements
- Node.js 18+ installed
- Git installed
- GitHub account (to export project)
- Mac with Xcode (for iOS builds)
- Android Studio (for Android builds)

### Platform-Specific Requirements

#### iOS Development
- **macOS** (required for iOS builds)
- **Xcode 14+** (free from Mac App Store)
- **Apple Developer Account** ($99/year for App Store distribution)
- **CocoaPods** (install: `sudo gem install cocoapods`)

#### Android Development
- **Windows, macOS, or Linux**
- **Android Studio** (free from android.com/studio)
- **Java Development Kit (JDK) 17** (included with Android Studio)
- **Google Play Developer Account** ($25 one-time fee for Play Store distribution)

---

## Step 1: Export Project to GitHub

1. In Lovable editor, click **GitHub** button (top right)
2. Click **Connect to GitHub** (if not already connected)
3. Click **Create Repository**
4. Wait for export to complete

---

## Step 2: Clone Repository Locally

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install dependencies
npm install
```

---

## Step 3: Add iOS Platform (macOS only)

```bash
# Add iOS platform
npx cap add ios

# Update iOS dependencies
npx cap update ios

# Sync web assets to iOS
npm run build
npx cap sync ios
```

### Configure iOS Permissions

1. Open `ios/App/App/Info.plist` in a text editor
2. Add camera and photo library permissions:

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to take photos for AI generation</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to select images for AI generation</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>This app needs permission to save generated content to your photo library</string>
```

### Open in Xcode

```bash
npx cap open ios
```

### Configure App in Xcode

1. Select **App** target in left sidebar
2. Go to **Signing & Capabilities** tab
3. Select your **Team** (Apple Developer account)
4. Xcode will automatically create provisioning profiles

### Build and Run

1. Select a simulator or connected device from the top bar
2. Click the **Play** button (or press Cmd+R)
3. App will build and launch

---

## Step 4: Add Android Platform

```bash
# Add Android platform
npx cap add android

# Update Android dependencies
npx cap update android

# Sync web assets to Android
npm run build
npx cap sync android
```

### Configure Android Permissions

Permissions are already set in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

### Open in Android Studio

```bash
npx cap open android
```

### Build and Run

1. Wait for Gradle sync to complete
2. Select a device/emulator from the top bar
3. Click the **Run** button (green play icon)
4. App will build and launch

---

## Step 5: Development Workflow

### Hot Reload (Recommended for Development)

The app is configured to load from your Lovable preview URL by default:
```typescript
// capacitor.config.ts
server: {
  url: 'https://585fed1d-fb40-4817-a3fe-86d08fb9a96c.lovableproject.com?forceHideBadge=true',
  cleartext: true
}
```

**Benefits:**
- Make changes in Lovable
- Changes appear instantly in mobile app
- No need to rebuild

### Production Build (For Testing or Release)

When ready to build standalone app:

1. **Remove server URL** from `capacitor.config.ts`:
```typescript
// Comment out or remove these lines:
// server: {
//   url: 'https://...',
//   cleartext: true
// }
```

2. **Build and sync:**
```bash
npm run build
npx cap sync
```

3. **Open in IDE and build:**
```bash
# iOS
npx cap open ios

# Android
npx cap open android
```

### Switching Between Dev and Prod

**For Development:**
- Keep `server.url` in capacitor.config.ts
- Just run the app (no rebuild needed)
- Changes from Lovable appear instantly

**For Production:**
- Remove `server.url` from capacitor.config.ts
- Run `npm run build && npx cap sync`
- App now runs fully offline

---

## Step 6: Testing on Physical Devices

### iOS (Physical Device)

1. Connect iPhone/iPad via USB
2. In Xcode, select your device from the dropdown
3. Trust your developer certificate on device when prompted
4. Click Run

### Android (Physical Device)

1. Enable **Developer Mode** on Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Settings → System → Developer Options
   - Enable "USB Debugging"
3. Connect device via USB
4. Select device in Android Studio
5. Click Run

---

## Step 7: App Icons and Splash Screens

### Generate Assets

Use a tool like [App Icon Generator](https://www.appicon.co/) or [Capacitor Assets](https://github.com/ionic-team/capacitor-assets):

```bash
npm install -g @capacitor/assets
```

Place your icon and splash images:
- `resources/icon.png` (1024x1024)
- `resources/splash.png` (2732x2732)

Generate all sizes:
```bash
npx @capacitor/assets generate
```

### Manual Configuration

#### iOS
Place icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Sizes: 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024

#### Android
Place icons in `android/app/src/main/res/`:
- `mipmap-mdpi/` (48x48)
- `mipmap-hdpi/` (72x72)
- `mipmap-xhdpi/` (96x96)
- `mipmap-xxhdpi/` (144x144)
- `mipmap-xxxhdpi/` (192x192)

---

## Step 8: App Store Submission

### iOS App Store

1. **Create App Store Connect listing:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com/)
   - Create new app
   - Fill in metadata (name, description, screenshots, etc.)

2. **Archive and upload:**
   - In Xcode: Product → Archive
   - Click "Distribute App"
   - Follow wizard to upload to App Store

3. **Submit for review:**
   - Complete all required info in App Store Connect
   - Submit for review (usually 1-3 days)

### Google Play Store

1. **Create Play Console listing:**
   - Go to [Google Play Console](https://play.google.com/console)
   - Create new app
   - Fill in store listing details

2. **Generate signed APK/Bundle:**
   - In Android Studio: Build → Generate Signed Bundle/APK
   - Create new keystore (save it securely!)
   - Build release bundle

3. **Upload and release:**
   - Upload AAB file to Play Console
   - Complete all required sections
   - Submit for review (usually 1-3 days)

---

## Troubleshooting

### iOS Issues

**Build fails with "No provisioning profiles found":**
- Ensure you're signed in with Apple ID in Xcode
- Go to Signing & Capabilities → select Team

**App crashes on launch:**
- Check Console.app for crash logs
- Ensure Info.plist has required permission keys

**Camera not working:**
- Add camera permissions to Info.plist (see Step 3)
- Test on physical device (camera doesn't work in simulator)

### Android Issues

**Gradle sync failed:**
- Check internet connection
- Update Android Studio to latest version
- File → Invalidate Caches and Restart

**App crashes with "Permission denied":**
- Check AndroidManifest.xml for missing permissions
- For Android 13+, request permissions at runtime

**Black screen on launch:**
- Clear build cache: Build → Clean Project
- Rebuild: Build → Rebuild Project

### General Issues

**Changes not showing after sync:**
```bash
# Clear caches and rebuild
rm -rf dist
npm run build
npx cap sync
```

**Native plugins not working:**
```bash
# Update all Capacitor dependencies
npx cap update
```

**"Module not found" errors:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Useful Commands

```bash
# Build web assets
npm run build

# Sync web assets to native projects
npx cap sync

# Sync specific platform
npx cap sync ios
npx cap sync android

# Open in IDE
npx cap open ios
npx cap open android

# Update Capacitor dependencies
npx cap update

# Check Capacitor configuration
npx cap doctor

# View native logs
npx cap run ios --livereload
npx cap run android --livereload
```

---

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Material Design Guidelines](https://m3.material.io/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy Center](https://play.google.com/about/developer-content-policy/)
- [Lovable Mobile Development Blog Post](https://lovable.dev/blogs/TODO)

---

## Support

For issues specific to Capacitor setup, check:
- [Capacitor GitHub Issues](https://github.com/ionic-team/capacitor/issues)
- [Capacitor Community Discord](https://discord.gg/UPYYRhtyzp)

For Lovable-specific questions:
- [Lovable Documentation](https://docs.lovable.dev)
- [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)

---

**Good luck with your mobile app launch! 🚀**
