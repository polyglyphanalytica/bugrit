# Security Policy

This document outlines security best practices, sensitive configuration, and incident response procedures for Bugrit.

## Table of Contents

- [Security Best Practices](#security-best-practices)
- [Environment Variables](#environment-variables)
- [API Key Management](#api-key-management)
- [Authentication & Authorization](#authentication--authorization)
- [Rate Limiting](#rate-limiting)
- [Data Encryption](#data-encryption)
- [Reporting Security Issues](#reporting-security-issues)

---

## Security Best Practices

### General Guidelines

1. **Never commit secrets** - All sensitive values must be stored in environment variables
2. **Use .env.example** - Document required variables without real values
3. **Rotate credentials regularly** - See [API Key Rotation](#api-key-rotation-procedures) below
4. **Principle of least privilege** - Grant minimum necessary permissions
5. **Keep dependencies updated** - Regularly run `npm audit` and update packages
6. **Enable 2FA** - Require two-factor authentication for all admin accounts

### Code Security

1. **Input validation** - Always validate and sanitize user input
2. **Output encoding** - Encode output to prevent XSS attacks
3. **Parameterized queries** - Never concatenate user input into queries
4. **HTTPS only** - All production traffic must use TLS
5. **Content Security Policy** - Configure appropriate CSP headers

---

## Environment Variables

### Security-Sensitive Variables

The following environment variables contain sensitive data and require special handling:

| Variable | Sensitivity | Description |
|----------|-------------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **CRITICAL** | Full Firebase Admin access |
| `ADMIN_ENCRYPTION_KEY` | **CRITICAL** | Encrypts admin panel data |
| `STRIPE_SECRET_KEY` | **CRITICAL** | Full Stripe API access |
| `STRIPE_WEBHOOK_SECRET` | **HIGH** | Validates Stripe webhooks |
| `ADMIN_API_KEY` | **HIGH** | Server-to-server auth |
| `GITHUB_TOKEN` | **HIGH** | GitHub API access |
| `GITHUB_APP_PRIVATE_KEY` | **HIGH** | GitHub App authentication |
| `RESEND_API_KEY` | **MEDIUM** | Email sending capability |
| `SENTRY_AUTH_TOKEN` | **MEDIUM** | Sentry API access |
| `SONARQUBE_TOKEN` | **MEDIUM** | SonarQube API access |
| `ZAP_API_KEY` | **MEDIUM** | OWASP ZAP access |

### Variable Requirements by Environment

#### Production (Required)

```bash
# Must be set - app will fail to start without these
ADMIN_ENCRYPTION_KEY=<32+ character secure key>
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
```

#### Production (Strongly Recommended)

```bash
# Should be set for full functionality
FIREBASE_SERVICE_ACCOUNT_KEY=<service-account-json>
SUPERADMIN_EMAIL=admin@yourdomain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Generating Secure Keys

```bash
# Generate ADMIN_ENCRYPTION_KEY (32 hex characters)
openssl rand -hex 16

# Generate a secure random string (64 characters)
openssl rand -base64 48

# Generate a UUID
uuidgen
```

---

## API Key Management

### API Key Structure

API keys in Bugrit follow this format:
- Prefix: `bgrt_` (identifies as Bugrit key)
- Environment: `live_` or `test_`
- Random string: 32+ characters

Example: `bgrt_live_a1b2c3d4e5f6g7h8i9j0...`

### API Key Rotation Procedures

#### Stripe Keys

1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers > API Keys
3. Click "Roll key" on the secret key
4. Update `STRIPE_SECRET_KEY` in your environment
5. Verify webhook deliveries continue working
6. Rotate `STRIPE_WEBHOOK_SECRET` if compromised

#### Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project Settings > Service Accounts
3. Click "Generate new private key"
4. Update `FIREBASE_SERVICE_ACCOUNT_KEY` with new JSON
5. Delete the old service account key from Firebase

#### Admin Encryption Key

**WARNING**: Rotating this key will invalidate encrypted admin data.

1. Plan for data migration before rotation
2. Export any encrypted data using current key
3. Generate new key: `openssl rand -hex 16`
4. Update `ADMIN_ENCRYPTION_KEY`
5. Re-encrypt data with new key

#### GitHub Tokens

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Generate new token with required scopes
3. Update `GITHUB_TOKEN` in environment
4. Revoke old token

### Key Rotation Schedule

| Key Type | Rotation Frequency | Notes |
|----------|-------------------|-------|
| Stripe Keys | Annually or on suspected compromise | |
| Firebase Service Account | Annually | Requires deployment |
| Admin Encryption Key | Rarely | Requires data migration |
| GitHub Tokens | 90 days | Or on personnel change |
| API Keys (user-generated) | User discretion | Encourage regular rotation |

---

## Authentication & Authorization

### Authentication Methods

1. **Firebase Authentication** - Primary user authentication
   - Email/password
   - Google OAuth
   - GitHub OAuth

2. **API Key Authentication** - For programmatic access
   - Bearer token in Authorization header
   - Key validation via database lookup

3. **Admin Authentication** - For admin panel access
   - Firebase Auth + superadmin email check
   - Optional: ADMIN_API_KEY for internal services

### Authorization Levels

| Role | Access Level | Description |
|------|--------------|-------------|
| Anonymous | Public endpoints only | Marketing pages, docs |
| User | Own resources | Applications, test results |
| Organization Member | Organization resources | Shared applications |
| Organization Admin | Full org access | Member management |
| Superadmin | Full system access | Admin panel |

### Session Security

- Session tokens expire after 1 hour of inactivity
- Refresh tokens valid for 7 days
- Sessions invalidated on password change
- Concurrent session limit: 5 per user

---

## Rate Limiting

### Default Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Public API | 100 requests | 15 minutes |
| Authenticated API | 1000 requests | 15 minutes |
| Authentication endpoints | 10 requests | 15 minutes |
| Webhook endpoints | 100 requests | 1 minute |
| Admin API | 500 requests | 15 minutes |

### Rate Limit Headers

All API responses include:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
```

### Rate Limit Configuration

Rate limits can be customized per API key:
- Basic tier: 1,000 requests/15min
- Pro tier: 5,000 requests/15min
- Business tier: 20,000 requests/15min
- Enterprise: Custom limits

### Handling Rate Limits

When rate limited, the API returns:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please retry after 60 seconds.",
  "retryAfter": 60
}
```

---

## Data Encryption

### At Rest

- **Database**: Firebase Firestore with Google-managed encryption
- **File Storage**: Firebase Storage with AES-256 encryption
- **Backups**: Encrypted using Google Cloud KMS

### In Transit

- **TLS 1.3** required for all connections
- **HSTS** headers enabled with 1-year max-age
- **Certificate pinning** for mobile apps (if applicable)

### Application-Level Encryption

Sensitive admin data is encrypted using AES-256-GCM:
- Key: `ADMIN_ENCRYPTION_KEY` environment variable
- Algorithm: AES-256-GCM
- Key derivation: PBKDF2 with SHA-256

---

## Security Headers

The application sets the following security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

---

## Audit Logging

### Logged Events

- Authentication attempts (success/failure)
- API key creation/revocation
- Permission changes
- Admin actions
- Data exports
- Configuration changes

### Log Retention

- Security logs: 90 days
- Access logs: 30 days
- Error logs: 30 days

---

## Reporting Security Issues

### Security Contact

For security vulnerabilities, please contact:

- **Email**: security@buggered.app
- **Response Time**: Within 48 hours

### Responsible Disclosure

We follow responsible disclosure practices:

1. **Report** - Email details to security contact
2. **Acknowledge** - We acknowledge within 48 hours
3. **Investigate** - We investigate and determine severity
4. **Fix** - We develop and test a fix
5. **Disclose** - Coordinated public disclosure

### What to Include

When reporting a security issue, please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested remediation (if any)
- Your contact information

### Bug Bounty

We currently do not have a formal bug bounty program, but we recognize security researchers who responsibly disclose vulnerabilities.

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | Active exploit, data breach | Immediate |
| High | Vulnerability with clear exploit path | 24 hours |
| Medium | Potential vulnerability | 72 hours |
| Low | Hardening suggestion | 1 week |

### Response Procedure

1. **Contain** - Isolate affected systems
2. **Assess** - Determine scope and impact
3. **Remediate** - Apply fixes
4. **Communicate** - Notify affected parties
5. **Review** - Post-incident analysis

---

## Compliance

### Data Protection

- GDPR compliance for EU users
- User data export on request
- Right to deletion ("right to be forgotten")
- Data processing agreements available

### Security Standards

This application follows security practices aligned with:
- OWASP Top 10
- CIS Controls
- SOC 2 Type II principles

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-20 | Initial security documentation |

---

*Last updated: January 2024*
