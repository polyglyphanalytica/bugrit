# Bugrit

Automated bug detection and code quality scanning as a service. Submit your web application and get comprehensive reports covering security vulnerabilities, performance issues, accessibility gaps, and code quality problems.

## Features

- **Security Scanning** - Detect exposed secrets, XSS, SQL injection, and OWASP Top 10 vulnerabilities
- **Performance Analysis** - Lighthouse-powered audits for Core Web Vitals and loading performance
- **Accessibility Testing** - axe-core and Pa11y checks for WCAG compliance
- **Code Quality** - ESLint, Biome, and custom rule analysis
- **Vibe Score** - Unified quality score combining all scan dimensions
- **AI-Powered Reports** - Genkit-driven intelligence reports with actionable recommendations
- **CI/CD Integration** - GitHub Actions, GitLab CI, Jenkins, and more
- **Slack & Telegram Bots** - Get scan results delivered to your team chat
- **Stripe Billing** - Three subscription tiers: Solo ($19/mo), Scale ($49/mo), Business ($99/mo)

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Auth**: [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Database**: [Cloud Firestore](https://firebase.google.com/docs/firestore)
- **Billing**: [Stripe](https://stripe.com/)
- **AI**: [Genkit](https://firebase.google.com/docs/genkit) with Google AI
- **Hosting**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- **Testing**: [Vitest](https://vitest.dev/)

## Getting Started

### Prerequisites

- Node.js 20+
- A Firebase project
- A Stripe account (for billing features)

### Installation

```bash
git clone https://github.com/polyglyphanalytica/bugrit.git
cd bugrit
npm install
```

### Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Firebase and Stripe credentials in `.env.local`. See `.env.example` for the full list of variables and instructions.

3. Alternatively, use the interactive setup script to provision secrets via GCP Secret Manager:
   ```bash
   npm run setup:secrets
   ```

### Development

```bash
npm run dev           # Start dev server (Turbopack, port 9002)
npm run build         # Production build
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint
npm run test          # Run tests (Vitest)
npm run test:watch    # Tests in watch mode
npm run test:coverage # Tests with coverage report
```

## Project Structure

```
src/
  app/          # Next.js pages and API routes
  components/   # React UI components (shadcn/ui based)
  lib/          # Core business logic
scripts/        # Operational scripts (setup, deploy)
worker/         # Cloud Run scan worker (Puppeteer/Chromium)
functions/      # Firebase Cloud Functions
infra/          # Infrastructure config
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

For security concerns, please see [SECURITY.md](SECURITY.md). Do **not** open public issues for security vulnerabilities - email security@buggered.app instead.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
