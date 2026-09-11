# INRFS Financer Mobile

Frontend-only Expo React Native implementation of the INRFS Financer Loan Management design. The application contains separate financer and super-admin experiences, local mock data, form validation, responsive native layouts, and simulated submissions. It does not connect to a backend.

## Requirements

- Node.js 20.19.x
- npm 10+
- Expo Go compatible with Expo SDK 53, or an Android/iOS development build

## Install and run

```powershell
npm install
npm start
```

Then press `a` for Android, `i` for iOS (on macOS), or scan the QR code with a compatible Expo Go client.

Other commands:

```powershell
npm run android
npm run ios
npm run web
npm run typecheck
npm run lint
npx expo-doctor
```

## Navigation

The portal selection screen branches into:

- Financer: mobile login or registration → OTP → welcome → financer workspace.
- Admin: email/password login → admin workspace.

Each workspace has four primary bottom destinations and a complete slide-up menu for the remaining design sections. Cards, rows, quick actions, tabs, menus, forms, detail views, modal sheets, toggles, filters, password visibility, payment calculations, and simulated submissions are interactive.

## Structure

```text
App.tsx
src/
  components/       Shared logo and native UI primitives
  data/             Local mock customers, loans, payments and billing
  navigation/       Typed root navigation stack
  screens/
    auth/            Portal selection and authentication flows
    financer/        Complete financer workspace and modal flows
    admin/           Complete admin workspace and modal flows
  theme/            Central colors, fonts, spacing, radii and shadows
  types/            Navigation and UI domain types
```

The downloaded Figma Make source archive is retained in the repository root as the implementation reference and is not used at runtime.
# INRFS Financer Mobile

## API configuration

The app defaults to the same production API as the web application:
`https://financer.inrfs.com/api/api/v1`. Copy `.env.example` to `.env` to use it.
For a local backend, override `EXPO_PUBLIC_API_BASE_URL` with the development
machine's LAN address for a physical phone, `http://10.0.2.2:5187/api/v1` for an
Android emulator, or `http://localhost:5187/api/v1` for an iOS simulator.
The API address is bundled into release builds, so rebuild and reinstall the APK
after changing it.

Authentication tokens are persisted with `expo-secure-store`. The access token
is attached as a bearer token; the refresh token is sent to `/auth/refresh` in
the request body, matching the native-safe backend contract.
