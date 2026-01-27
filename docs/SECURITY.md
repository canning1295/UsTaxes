# Security Module Documentation

## Overview

The security module provides optional password protection, biometric authentication, and password recovery features for UsTaxes. Since tax data contains sensitive personal and financial information, users can enable encryption to protect their data at rest.

## Features

### Password Protection

When enabled, user data is encrypted using the Web Crypto API with AES-GCM encryption. The password is never stored - only a PBKDF2-derived hash is used to verify the password.

- **Encryption**: AES-GCM (256-bit key)
- **Key Derivation**: PBKDF2 with SHA-256, 100,000 iterations
- **Salt**: Randomly generated per encryption

### Biometric Authentication

Users can enable fingerprint, Face ID, or other biometric authentication methods using the Web Authentication (WebAuthn) API. This allows quick access without entering the password each time.

- Requires password protection to be enabled first
- Uses device's built-in biometric sensors
- Falls back to password if biometrics unavailable

### Session Timeout

When password protection is enabled, users can optionally enable automatic session timeout. The app will automatically lock after a period of inactivity (configurable from 5 minutes to 1 hour, or disabled).

### Password Recovery

Users can set up three security questions to recover their account if they forget their password. All three questions must be answered correctly to regain access.

- 10 predefined security questions to choose from
- Each question must be unique
- Answers are case-insensitive

### Lockout Protection

To prevent brute force attacks, the app implements a lockout mechanism:

- After 5 failed password attempts, the user is locked out for 5 minutes
- Failed attempts and lockout state are tracked in Redux

## Architecture

### Directory Structure

```
src/
├── crypto/                    # Core encryption module
│   ├── encrypt.ts            # Encryption/decryption functions
│   ├── index.ts              # Module exports
│   ├── transform.ts          # Data transformations
│   ├── types.ts              # Type definitions
│   └── tests/                # Unit tests
│
├── redux/security/           # Redux state management
│   ├── actions.ts            # Action creators
│   ├── reducer.ts            # State reducer and selectors
│   └── index.ts              # Module exports
│
├── components/security/      # UI components
│   ├── PasswordPrompt.tsx    # Password entry dialog
│   ├── PasswordSetup.tsx     # Initial password setup
│   ├── SecuritySettingsPage.tsx  # Main settings page
│   ├── styles.ts             # Shared styles
│   └── index.ts              # Component exports
│
└── tests/security/           # Integration tests
    └── SecurityIntegration.test.tsx
```

### State Shape

```typescript
interface SecurityState {
  settings: SecuritySettings
  lock: LockState
}

interface SecuritySettings {
  passwordEnabled: boolean
  passwordHash: string | null
  biometricEnabled: boolean
  biometricCredentialId: string | null
  sessionTimeoutEnabled: boolean
  sessionTimeoutMinutes: SessionTimeoutMinutes
  lastActivity: number
  passwordRecoveryEnabled: boolean
  securityQuestions: SecurityQuestion[]
}

interface SecurityQuestion {
  question: string
  answerHash: string
}

interface LockState {
  isLocked: boolean
  failedAttempts: number
  lockoutUntil: number | null
}
```

### Actions

| Action                        | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `ENABLE_PASSWORD_PROTECTION`  | Enable password and store hash              |
| `DISABLE_PASSWORD_PROTECTION` | Disable password protection                 |
| `SET_SESSION_TIMEOUT`         | Set timeout duration in minutes             |
| `ENABLE_SESSION_TIMEOUT`      | Enable auto-lock on inactivity              |
| `DISABLE_SESSION_TIMEOUT`     | Disable auto-lock                           |
| `ENABLE_BIOMETRIC`            | Enable biometric authentication             |
| `DISABLE_BIOMETRIC`           | Disable biometric authentication            |
| `SET_BIOMETRIC_CREDENTIAL`    | Store biometric credential ID               |
| `ENABLE_PASSWORD_RECOVERY`    | Enable security question recovery           |
| `DISABLE_PASSWORD_RECOVERY`   | Disable password recovery                   |
| `SET_SECURITY_QUESTIONS`      | Store security questions and hashed answers |
| `LOCK_APP`                    | Lock the app immediately                    |
| `UNLOCK_APP`                  | Unlock after password verification          |
| `RECORD_FAILED_ATTEMPT`       | Track failed password attempt               |
| `RESET_FAILED_ATTEMPTS`       | Clear failed attempt counter                |
| `UPDATE_LAST_ACTIVITY`        | Update activity timestamp                   |

### Selectors

```typescript
selectSecuritySettings(state) // Get all security settings
selectLockState(state) // Get lock state
selectIsLocked(state) // Check if app is locked
selectIsPasswordEnabled(state) // Check if password is enabled
selectIsBiometricEnabled(state) // Check if biometrics enabled
selectIsSessionTimeoutEnabled(state) // Check if timeout is enabled
selectIsPasswordRecoveryEnabled(state) // Check if recovery enabled
selectSecurityQuestions(state) // Get security questions
```

## Usage

### Accessing Security Settings

Navigate to the Security Settings page via:

- The security icon (🔒) in the sidebar
- Direct URL: `/security`

### Enabling Password Protection

1. Toggle "Password Protection" to On
2. Enter a strong password (minimum 8 characters)
3. Confirm the password
4. Click "Set Password"

### Changing Password

1. Navigate to Security Settings
2. Click "Change Password"
3. Enter current password
4. Enter and confirm new password

### Biometric Authentication

1. Enable Password Protection first
2. Toggle "Biometric Authentication" to On
3. Your device will prompt for fingerprint/Face ID registration
4. Once enabled, you can unlock the app with biometrics

**Note**: Biometric authentication requires a device with fingerprint or facial recognition hardware and browser support for WebAuthn.

### Session Timeout

1. Enable Password Protection first
2. Toggle "Session Timeout" to On
3. Select timeout duration (5-60 minutes)

### Password Recovery

1. Enable Password Protection first
2. Toggle "Enable Password Recovery" to On
3. Click "Setup Recovery Questions"
4. Select 3 security questions and provide answers
5. Click "Save Questions"

**Note**: All three questions must be answered correctly to recover access.

## Testing

Run the security tests:

```bash
# Run crypto module tests
npm test -- --testPathPattern="crypto" --watchAll=false

# Run integration tests
npm test -- --testPathPattern="SecurityIntegration" --watchAll=false

# Run all security-related tests
npm test -- --testPathPattern="crypto|SecurityIntegration" --watchAll=false
```

## Security Considerations

1. **Data at Rest**: When password protection is enabled, data is encrypted before being stored in localStorage
2. **No Server Storage**: All data remains on the user's device
3. **Password Never Stored**: Only a hash is stored for verification
4. **Secure Key Derivation**: PBKDF2 with high iteration count resists brute force
5. **Rate Limiting**: Lockout after failed attempts prevents rapid guessing
6. **Security Question Answers**: Stored as hashes, not plaintext
7. **Biometric Credentials**: Stored securely by the device, only credential ID is saved

## Future Enhancements

- [ ] Hardware security key support (WebAuthn with security keys)
- [ ] Encrypted cloud backup option
- [ ] Password strength indicator
