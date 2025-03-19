# Mental Math App

A comprehensive mental math practice application that helps users improve their calculation skills through various exercises.

## 
#### Progressive Web App (PWA)

To build the optimized PWA version:

```
npm run build-pwa
```

The PWA will be ready to deploy in the `dist` directory.

#### Desktop App (Windows, macOS, Linux)

To build the desktop application:

```
npm run build-electron
```

The packaged applications will be available in the `dist-electron` directory.

#### Mobile App (iOS, Android)

First, install Capacitor and add the platforms:

```
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

Then build the app and sync with Capacitor:

```
npm run build-capacitor
```

For iOS:
```
npx cap open ios
```

For Android:
```
npx cap open android
```

This will open the native IDE (Xcode for iOS, Android Studio for Android) where you can build and run the app on simulators or physical devices.

## Deployment

### Web/PWA

You can deploy the contents of the `dist` directory to any static web hosting service like:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting

### App Stores

For mobile apps, follow the respective app store submission guidelines:
- [Apple App Store](https://developer.apple.com/app-store/submissions/)
- [Google Play Store](https://developer.android.com/distribute/console)

For desktop apps, you can distribute the packaged applications directly or through stores like:
- [Mac App Store](https://developer.apple.com/app-store/mac/)
- [Microsoft Store](https://developer.microsoft.com/en-us/microsoft-store/)

## License

MIT 
