#!/usr/bin/env npx ts-node

/**
 * Bugrit Secret Provisioning Agent
 *
 * Fully automates the creation and provisioning of all secrets required
 * by Firebase App Hosting (apphosting.yaml).
 *
 * What it does:
 *   1. Checks CLI authentication (gcloud, firebase, stripe)
 *   2. Discovers which secrets already exist vs are missing
 *   3. Extracts Firebase web SDK config automatically
 *   4. Creates Stripe products & prices (Solo, Scale, Business) in test + live
 *   5. Auto-generates cryptographic secrets (encryption keys, tokens, etc.)
 *   6. Prompts for remaining external service credentials
 *   7. Provisions everything into GCP Secret Manager
 *   8. Grants Firebase App Hosting backend access
 *   9. Optionally writes .env.local for local development
 *
 * Prerequisites — authenticate each CLI via browser BEFORE running:
 *   gcloud auth login
 *   firebase login
 *   stripe login            # authenticates to your Stripe account (test + live)
 *
 * Usage:
 *   npx ts-node scripts/setup-secrets.ts
 *   npx ts-node scripts/setup-secrets.ts --force   # overwrite existing secrets
 *   npm run setup:secrets
 *   npm run setup:secrets -- --force
 */

import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import * as crypto from 'crypto';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// ─── Configuration ───────────────────────────────────────────────────────────

const PROJECT_ID = 'bugrit-prod';
const BACKEND_ID = 'bugrit';
const BACKEND_LOCATION = 'us-central1';
const FORCE_OVERWRITE = process.argv.includes('--force');

/** Stripe product catalogue — matches src/lib/subscriptions/tiers.ts */
const STRIPE_PRODUCTS = [
  {
    tierName: 'starter',
    displayName: 'Bugrit Solo',
    description: 'For side projects and indie hackers',
    monthlyAmountCents: 1900,
    yearlyAmountCents: 19000,
  },
  {
    tierName: 'pro',
    displayName: 'Bugrit Scale',
    description: 'For serious builders shipping often',
    monthlyAmountCents: 4900,
    yearlyAmountCents: 49000,
  },
  {
    tierName: 'business',
    displayName: 'Bugrit Business',
    description: "For teams that can't afford to ship bugs",
    monthlyAmountCents: 9900,
    yearlyAmountCents: 99000,
  },
];

const TOTAL_PHASES = 9;

// ─── Colours & Logging ──────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(msg: string) {
  console.log(msg);
}
function info(msg: string) {
  console.log(`  ${c.cyan}i${c.reset} ${msg}`);
}
function ok(msg: string) {
  console.log(`  ${c.green}\u2713${c.reset} ${msg}`);
}
function warn(msg: string) {
  console.log(`  ${c.yellow}!${c.reset} ${msg}`);
}
function fail(msg: string) {
  console.log(`  ${c.red}x${c.reset} ${msg}`);
}
function heading(phase: number, msg: string) {
  log('');
  log(`${c.bold}${c.blue}${'='.repeat(64)}${c.reset}`);
  log(`${c.bold}${c.blue}  Phase ${phase}/${TOTAL_PHASES}: ${msg}${c.reset}`);
  log(`${c.bold}${c.blue}${'='.repeat(64)}${c.reset}`);
  log('');
}

// ─── Shell Helpers ───────────────────────────────────────────────────────────

interface RunOpts {
  silent?: boolean;
  input?: string;
}

function run(cmd: string, opts: RunOpts = {}): string {
  try {
    const execOpts: ExecSyncOptionsWithStringEncoding = {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    };
    if (opts.input !== undefined) {
      execOpts.input = opts.input;
      execOpts.stdio = ['pipe', 'pipe', opts.silent ? 'pipe' : 'inherit'];
    } else {
      execOpts.stdio = opts.silent
        ? ['pipe', 'pipe', 'pipe']
        : ['pipe', 'pipe', 'inherit'];
    }
    return execSync(cmd, execOpts).trim();
  } catch (e: any) {
    if (opts.silent) return '';
    throw e;
  }
}

/** Run a command and parse the stdout as JSON. Returns null on any failure. */
function safeRunJson(cmd: string): any {
  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (!result) return null;
    return JSON.parse(result);
  } catch (e: any) {
    // Surface the real error: prefer stderr, then stdout, then message
    const stderr = e.stderr?.toString().trim();
    const stdout = e.stdout?.toString().trim();
    if (stderr) throw new Error(stderr);
    if (stdout) throw new Error(stdout);
    throw e;
  }
}

function runJson(cmd: string): any {
  const out = run(cmd, { silent: true });
  if (!out) return null;
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

// ─── Readline Helpers ────────────────────────────────────────────────────────

let rl: readline.Interface;

function initReadline() {
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // Graceful Ctrl+C
  rl.on('SIGINT', () => {
    log(`\n${c.yellow}Aborted by user.${c.reset}`);
    process.exit(0);
  });
}

function ask(question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` ${c.dim}[${defaultValue}]${c.reset}` : '';
  return new Promise((resolve) => {
    rl.question(`  ${c.yellow}?${c.reset} ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function askYesNo(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  return new Promise((resolve) => {
    rl.question(`  ${c.yellow}?${c.reset} ${question} [${hint}]: `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (!a) return resolve(defaultYes);
      resolve(a === 'y' || a === 'yes');
    });
  });
}

// ─── GCP Secret Manager Helpers ──────────────────────────────────────────────

function listExistingSecrets(): string[] {
  const out = run(
    `gcloud secrets list --project=${PROJECT_ID} --format="value(name)"`,
    { silent: true },
  );
  return out ? out.split('\n').filter(Boolean) : [];
}

function secretExists(name: string, existing: string[]): boolean {
  return existing.includes(name);
}

function createSecret(name: string, value: string, existing: string[]): void {
  if (existing.includes(name)) {
    // Add a new version to existing secret
    run(
      `gcloud secrets versions add ${name} --data-file=- --project=${PROJECT_ID}`,
      { input: value, silent: true },
    );
    ok(`Updated secret: ${name}`);
  } else {
    // Create new secret with first version
    run(
      `gcloud secrets create ${name} --data-file=- --project=${PROJECT_ID} --replication-policy=automatic`,
      { input: value, silent: true },
    );
    ok(`Created secret: ${name}`);
  }
}

function grantAppHostingAccess(secretName: string): void {
  // Try firebase CLI first (knows the right service account)
  try {
    run(
      `firebase apphosting:secrets:grantaccess ${secretName}` +
        ` --project ${PROJECT_ID}` +
        ` --backend ${BACKEND_ID}` +
        ` --location ${BACKEND_LOCATION}`,
      { silent: true },
    );
    ok(`Granted access: ${secretName}`);
  } catch {
    // Fallback: try the default App Hosting compute service account
    try {
      const sa = `firebase-apphosting-compute@${PROJECT_ID}.iam.gserviceaccount.com`;
      run(
        `gcloud secrets add-iam-policy-binding ${secretName}` +
          ` --member="serviceAccount:${sa}"` +
          ` --role="roles/secretmanager.secretAccessor"` +
          ` --project=${PROJECT_ID}`,
        { silent: true },
      );
      ok(`Granted access (via IAM): ${secretName}`);
    } catch {
      warn(
        `Could not grant access for ${secretName}. Run manually:\n` +
          `    firebase apphosting:secrets:grantaccess ${secretName} --project ${PROJECT_ID} --backend ${BACKEND_ID}`,
      );
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 1: Pre-flight Checks
// ═════════════════════════════════════════════════════════════════════════════

interface CliStatus {
  gcloud: boolean;
  firebase: boolean;
  stripe: boolean;
}

/** Check if a CLI tool exists on PATH by running its version command. */
function cliExists(versionCmd: string): string | null {
  try {
    const out = execSync(versionCmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10_000,
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function preflight(): CliStatus {
  heading(1, 'Pre-flight Checks');

  const status: CliStatus = { gcloud: false, firebase: false, stripe: false };

  // gcloud
  const gcloudVersion = cliExists('gcloud --version');
  if (gcloudVersion) {
    ok(`gcloud: ${gcloudVersion.split('\n')[0]}`);
    const account = run(
      'gcloud auth list --filter=status:ACTIVE --format="value(account)"',
      { silent: true },
    );
    if (account) {
      ok(`Authenticated as: ${account}`);
      status.gcloud = true;
    } else {
      fail('gcloud: not authenticated \u2014 run: gcloud auth login');
    }
  } else {
    fail('gcloud: not installed \u2014 https://cloud.google.com/sdk/docs/install');
  }

  // firebase
  const firebaseVersion = cliExists('firebase --version');
  if (firebaseVersion) {
    ok(`firebase: ${firebaseVersion}`);
    const out = run('firebase projects:list 2>/dev/null', { silent: true });
    if (out) {
      ok('firebase: authenticated');
      status.firebase = true;
    } else {
      warn('firebase: may not be authenticated \u2014 run: firebase login');
      status.firebase = true; // let it try anyway
    }
  } else {
    fail('firebase: not installed \u2014 npm install -g firebase-tools');
  }

  // stripe
  const stripeVersion = cliExists('stripe --version');
  if (stripeVersion) {
    ok(`stripe: ${stripeVersion}`);
    const conf = cliExists('stripe config --list');
    if (conf) {
      ok('stripe: authenticated');
      status.stripe = true;
    } else {
      warn('stripe: not authenticated \u2014 run: stripe login');
    }
  } else {
    warn('stripe: not installed (optional) \u2014 https://stripe.com/docs/stripe-cli');
  }

  // Verify project
  if (status.gcloud) {
    try {
      run(`gcloud projects describe ${PROJECT_ID} --format="value(projectId)"`, { silent: true });
      ok(`GCP project verified: ${PROJECT_ID}`);
    } catch {
      fail(`GCP project '${PROJECT_ID}' not found or no access`);
      status.gcloud = false;
    }
  }

  return status;
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 2: Discovery
// ═════════════════════════════════════════════════════════════════════════════

interface DiscoveryResult {
  required: string[];
  existing: string[];
  missing: string[];
}

function discover(): DiscoveryResult {
  heading(2, 'Discover Required Secrets');

  const yamlPath = path.resolve(__dirname, '..', 'apphosting.yaml');
  const yaml = fs.readFileSync(yamlPath, 'utf8');

  const required: string[] = [];
  const regex = /^\s*secret:\s*(.+)$/gm;
  let match;
  while ((match = regex.exec(yaml)) !== null) {
    required.push(match[1].trim());
  }

  info(`Found ${required.length} secret references in apphosting.yaml`);

  const existing = listExistingSecrets();
  const missing = required.filter((s) => !existing.includes(s));
  const found = required.filter((s) => existing.includes(s));

  if (found.length > 0) {
    ok(`Already exist: ${found.length}`);
    for (const s of found) {
      log(`      ${c.dim}${s}${c.reset}`);
    }
  }
  if (missing.length > 0) {
    warn(`Missing: ${missing.length}`);
    for (const s of missing) {
      log(`      ${c.red}${s}${c.reset}`);
    }
  }

  return { required, existing, missing };
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 3: Firebase SDK Config
// ═════════════════════════════════════════════════════════════════════════════

interface FirebaseConfig {
  apiKey: string;
  messagingSenderId: string;
  appId: string;
}

async function getFirebaseConfig(
  existing: string[],
): Promise<Record<string, string>> {
  heading(3, 'Firebase SDK Configuration');

  const secrets: Record<string, string> = {};

  // Check if all three already exist
  const needed = ['FIREBASE_API_KEY', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID'];
  const allExist = needed.every((n) => existing.includes(n));
  if (allExist && !FORCE_OVERWRITE) {
    ok('All Firebase SDK secrets already exist \u2014 skipping (use --force to overwrite)');
    return secrets;
  }

  info('Extracting web SDK config from Firebase...');

  try {
    const sdkOutput = run(
      `firebase apps:sdkconfig web --project ${PROJECT_ID} 2>/dev/null`,
      { silent: true },
    );

    if (!sdkOutput) {
      warn('No web app found. Trying to create one...');
      // Create a web app if none exists
      try {
        run(
          `firebase apps:create web "bugrit-web" --project ${PROJECT_ID} 2>/dev/null`,
          { silent: true },
        );
        ok('Created Firebase web app: bugrit-web');
      } catch {
        warn('Could not create web app automatically');
      }
    }

    // Retry getting config
    const output =
      sdkOutput ||
      run(`firebase apps:sdkconfig web --project ${PROJECT_ID} 2>/dev/null`, {
        silent: true,
      });

    const apiKeyMatch = output.match(/apiKey:\s*"([^"]+)"/);
    const senderIdMatch = output.match(/messagingSenderId:\s*"([^"]+)"/);
    const appIdMatch = output.match(/appId:\s*"([^"]+)"/);

    if (apiKeyMatch && senderIdMatch && appIdMatch) {
      secrets['FIREBASE_API_KEY'] = apiKeyMatch[1];
      secrets['FIREBASE_MESSAGING_SENDER_ID'] = senderIdMatch[1];
      secrets['FIREBASE_APP_ID'] = appIdMatch[1];

      ok(`API Key: ${apiKeyMatch[1].substring(0, 12)}...`);
      ok(`Messaging Sender ID: ${senderIdMatch[1]}`);
      ok(`App ID: ${appIdMatch[1]}`);
      return secrets;
    }
  } catch {
    // Fall through to manual entry
  }

  warn('Could not auto-extract Firebase config. Please enter manually.');
  info('Find these at: Firebase Console > Project Settings > General > Your Apps');

  if (!existing.includes('FIREBASE_API_KEY')) {
    secrets['FIREBASE_API_KEY'] = await ask('Firebase API Key');
  }
  if (!existing.includes('FIREBASE_MESSAGING_SENDER_ID')) {
    secrets['FIREBASE_MESSAGING_SENDER_ID'] = await ask('Firebase Messaging Sender ID');
  }
  if (!existing.includes('FIREBASE_APP_ID')) {
    secrets['FIREBASE_APP_ID'] = await ask('Firebase App ID');
  }

  return secrets;
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 4: Stripe Products & Prices
// ═════════════════════════════════════════════════════════════════════════════

async function setupStripeMode(
  mode: 'test' | 'live',
): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};
  const liveFlag = mode === 'live' ? ' --live' : '';
  const secretPrefix = mode === 'test' ? 'stripe-test-' : 'stripe-';

  info(`Creating Stripe ${mode.toUpperCase()} mode products & prices...`);
  log('');

  // List existing products to avoid duplicates
  let existingProducts: any[] = [];
  try {
    const parsed = safeRunJson(
      `stripe products list --limit=100${liveFlag}`,
    );
    existingProducts = parsed?.data || [];
  } catch {
    warn('Could not list existing Stripe products \u2014 will create fresh');
  }

  for (const product of STRIPE_PRODUCTS) {
    let productId: string;

    // Check if product already exists by name
    const existing = existingProducts.find(
      (p: any) => p.name === product.displayName && p.active,
    );

    if (existing) {
      productId = existing.id;
      ok(`Product exists: ${product.displayName} (${productId})`);
    } else {
      try {
        const parsed = safeRunJson(
          `stripe products create` +
            ` --name="${product.displayName}"` +
            ` --description="${product.description}"` +
            `${liveFlag}`,
        );
        if (!parsed?.id) throw new Error('No product ID in response');
        productId = parsed.id;
        ok(`Created product: ${product.displayName} (${productId})`);
      } catch (e: any) {
        fail(`Failed to create product: ${product.displayName} \u2014 ${e.message}`);
        continue;
      }
    }

    // List existing prices for this product
    let existingPrices: any[] = [];
    try {
      const parsed = safeRunJson(
        `stripe prices list --product=${productId} --active=true --limit=100${liveFlag}`,
      );
      existingPrices = parsed?.data || [];
    } catch {
      // No existing prices
    }

    // Monthly price
    const monthlySecret = `${secretPrefix}${product.tierName}-monthly-price-id`;
    const existingMonthly = existingPrices.find(
      (p: any) =>
        p.unit_amount === product.monthlyAmountCents &&
        p.recurring?.interval === 'month',
    );

    if (existingMonthly) {
      secrets[monthlySecret] = existingMonthly.id;
      ok(`  Monthly: ${existingMonthly.id} ($${product.monthlyAmountCents / 100}/mo) \u2014 exists`);
    } else {
      try {
        const parsed = safeRunJson(
          `stripe prices create` +
            ` --product=${productId}` +
            ` --unit-amount=${product.monthlyAmountCents}` +
            ` --currency=usd` +
            ` -d "recurring[interval]=month"` +
            `${liveFlag}`,
        );
        if (!parsed?.id) throw new Error('No price ID in response');
        secrets[monthlySecret] = parsed.id;
        ok(`  Monthly: ${parsed.id} ($${product.monthlyAmountCents / 100}/mo) \u2014 created`);
      } catch (e: any) {
        fail(`  Failed to create monthly price: ${e.message}`);
      }
    }

    // Yearly price
    const yearlySecret = `${secretPrefix}${product.tierName}-yearly-price-id`;
    const existingYearly = existingPrices.find(
      (p: any) =>
        p.unit_amount === product.yearlyAmountCents &&
        p.recurring?.interval === 'year',
    );

    if (existingYearly) {
      secrets[yearlySecret] = existingYearly.id;
      ok(`  Yearly:  ${existingYearly.id} ($${product.yearlyAmountCents / 100}/yr) \u2014 exists`);
    } else {
      try {
        const parsed = safeRunJson(
          `stripe prices create` +
            ` --product=${productId}` +
            ` --unit-amount=${product.yearlyAmountCents}` +
            ` --currency=usd` +
            ` -d "recurring[interval]=year"` +
            `${liveFlag}`,
        );
        if (!parsed?.id) throw new Error('No price ID in response');
        secrets[yearlySecret] = parsed.id;
        ok(`  Yearly:  ${parsed.id} ($${product.yearlyAmountCents / 100}/yr) \u2014 created`);
      } catch (e: any) {
        fail(`  Failed to create yearly price: ${e.message}`);
      }
    }

    log('');
  }

  return secrets;
}

async function setupStripe(
  existing: string[],
): Promise<Record<string, string>> {
  heading(4, 'Stripe Products & Prices');

  const secrets: Record<string, string> = {};

  // Test mode products & prices
  if (await askYesNo('Create Stripe TEST mode products & prices?')) {
    const testIds = await setupStripeMode('test');
    Object.assign(secrets, testIds);
  }

  // Live mode products & prices
  if (await askYesNo('Create Stripe LIVE mode products & prices?', false)) {
    info('Stripe CLI uses --live flag on commands (already handled). Make sure you ran: stripe login');
    const liveIds = await setupStripeMode('live');
    Object.assign(secrets, liveIds);
  }

  // Collect API keys (these come from the Stripe Dashboard, not CLI)
  log('');
  info('Now enter your Stripe API keys from the Dashboard > Developers > API keys');
  log('');

  const collectKey = async (name: string, prompt: string) => {
    if (existing.includes(name) && !FORCE_OVERWRITE) {
      ok(`${name}: already exists \u2014 skipping`);
      return;
    }
    const value = await ask(prompt);
    if (value) secrets[name] = value;
  };

  log(`  ${c.bold}Test mode keys:${c.reset}`);
  await collectKey('stripe-test-secret-key', 'Stripe TEST secret key (sk_test_...)');
  await collectKey('STRIPE_TEST_PUBLISHABLE_KEY', 'Stripe TEST publishable key (pk_test_...)');
  await collectKey('stripe-test-webhook-secret', 'Stripe TEST webhook signing secret (whsec_...)');

  log(`\n  ${c.bold}Live mode keys:${c.reset}`);
  await collectKey('stripe-secret-key', 'Stripe LIVE secret key (sk_live_...)');
  await collectKey('STRIPE_PUBLISHABLE_KEY', 'Stripe LIVE publishable key (pk_live_...)');
  await collectKey('stripe-webhook-secret', 'Stripe LIVE webhook signing secret (whsec_...)');

  return secrets;
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 5: Auto-Generate Crypto Secrets
// ═════════════════════════════════════════════════════════════════════════════

function generateCryptoSecrets(existing: string[]): Record<string, string> {
  heading(5, 'Auto-Generate Crypto Secrets');

  const secrets: Record<string, string> = {};

  const gen = (
    name: string,
    bytes: number,
    encoding: BufferEncoding = 'hex',
    description?: string,
  ) => {
    if (existing.includes(name) && !FORCE_OVERWRITE) {
      ok(`${name}: already exists \u2014 skipping`);
      return;
    }
    secrets[name] = crypto.randomBytes(bytes).toString(encoding);
    const desc = description ? ` (${description})` : '';
    ok(`Generated: ${name}${desc}`);
  };

  gen('admin-encryption-key', 16, 'hex', '32-char hex key');
  gen('admin-api-key', 32, 'base64url', 'server-to-server auth');
  gen('worker-secret', 32, 'base64', 'scan worker shared secret');
  gen('telegram-webhook-secret', 32, 'hex', 'Telegram webhook auth');
  gen('telegram-test-webhook-secret', 32, 'hex', 'Telegram test webhook auth');

  return secrets;
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 6: Collect External Service Credentials
// ═════════════════════════════════════════════════════════════════════════════

async function collectCredentials(
  existing: string[],
): Promise<Record<string, string>> {
  heading(6, 'External Service Credentials');

  const secrets: Record<string, string> = {};

  const collect = async (name: string, prompt: string): Promise<void> => {
    if (existing.includes(name) && !FORCE_OVERWRITE) {
      ok(`${name}: already exists \u2014 skipping`);
      return;
    }
    const value = await ask(prompt);
    if (value) {
      secrets[name] = value;
    } else {
      warn(`${name}: skipped (empty)`);
    }
  };

  const collectOrPlaceholder = async (
    name: string,
    prompt: string,
  ): Promise<void> => {
    if (existing.includes(name) && !FORCE_OVERWRITE) {
      ok(`${name}: already exists \u2014 skipping`);
      return;
    }
    const value = await ask(prompt, 'placeholder');
    secrets[name] = value;
  };

  // --- Platform ---
  log(`  ${c.bold}Platform${c.reset}`);
  await collect(
    'platform-superadmin-email',
    'Platform superadmin email address',
  );

  // --- Firebase Service Account Key ---
  log(`\n  ${c.bold}Firebase Admin SDK${c.reset}`);
  if (existing.includes('FIREBASE_SERVICE_ACCOUNT_KEY') && !FORCE_OVERWRITE) {
    ok('FIREBASE_SERVICE_ACCOUNT_KEY: already exists \u2014 skipping');
  } else {
    info('The Firebase Admin SDK needs a service account key (JSON).');
    if (await askYesNo('Auto-generate a service account key via gcloud?')) {
      try {
        // Find the firebase-adminsdk service account
        const saList = run(
          `gcloud iam service-accounts list --project=${PROJECT_ID} --format="value(email)" --filter="email:firebase-adminsdk"`,
          { silent: true },
        );
        const saEmail = saList.split('\n')[0]?.trim();

        if (saEmail) {
          const tmpFile = `/tmp/bugrit-sa-key-${Date.now()}.json`;
          run(
            `gcloud iam service-accounts keys create ${tmpFile} --iam-account=${saEmail} --project=${PROJECT_ID}`,
            { silent: true },
          );
          const keyJson = fs.readFileSync(tmpFile, 'utf8');
          fs.unlinkSync(tmpFile); // Clean up
          secrets['FIREBASE_SERVICE_ACCOUNT_KEY'] = keyJson;
          ok(`Generated service account key for: ${saEmail}`);
        } else {
          warn('No firebase-adminsdk service account found');
          const keyJson = await ask(
            'Paste the service account JSON (single line)',
          );
          if (keyJson) secrets['FIREBASE_SERVICE_ACCOUNT_KEY'] = keyJson;
        }
      } catch (e: any) {
        warn(`Auto-generate failed: ${e.message}`);
        const keyJson = await ask(
          'Paste the service account JSON (single line)',
        );
        if (keyJson) secrets['FIREBASE_SERVICE_ACCOUNT_KEY'] = keyJson;
      }
    } else {
      info(
        'Get it from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key',
      );
      const keyJson = await ask(
        'Paste the service account JSON (single line)',
      );
      if (keyJson) secrets['FIREBASE_SERVICE_ACCOUNT_KEY'] = keyJson;
    }
  }

  // --- GitHub OAuth ---
  log(`\n  ${c.bold}GitHub OAuth${c.reset}`);
  info('Create at: GitHub Settings > Developer Settings > OAuth Apps');
  info(
    'Callback URL: https://bugrit-prod.web.app/api/auth/github/callback',
  );
  await collect('github-client-id', 'GitHub OAuth Client ID');
  await collect('github-client-secret', 'GitHub OAuth Client Secret');

  // --- Email ---
  log(`\n  ${c.bold}Email (Resend)${c.reset}`);
  info('Get your API key from: https://resend.com/api-keys');
  await collect('resend-api-key', 'Resend API key');

  // --- Scan Worker ---
  log(`\n  ${c.bold}Scan Worker${c.reset}`);
  info(
    'This is your Cloud Run scan worker URL. If not deployed yet, use a placeholder.',
  );
  await collectOrPlaceholder(
    'scan-worker-url',
    'Scan worker Cloud Run URL',
  );

  // --- Slack ---
  log(`\n  ${c.bold}Slack Integration${c.reset}`);
  if (await askYesNo('Configure Slack integration?', false)) {
    info('Create apps at: https://api.slack.com/apps');
    log(`\n    ${c.dim}Live:${c.reset}`);
    await collect('slack-signing-secret', 'Slack LIVE signing secret');
    await collect('slack-bot-token', 'Slack LIVE bot token (xoxb-...)');
    log(`\n    ${c.dim}Test:${c.reset}`);
    await collect('slack-test-signing-secret', 'Slack TEST signing secret');
    await collect('slack-test-bot-token', 'Slack TEST bot token (xoxb-...)');
  } else {
    // Create placeholders for skipped integrations so the build doesn't fail
    for (const name of [
      'slack-signing-secret',
      'slack-bot-token',
      'slack-test-signing-secret',
      'slack-test-bot-token',
    ]) {
      if (!existing.includes(name)) {
        secrets[name] = 'placeholder';
        warn(`${name}: set to placeholder`);
      }
    }
  }

  // --- Telegram ---
  log(`\n  ${c.bold}Telegram Integration${c.reset}`);
  if (await askYesNo('Configure Telegram integration?', false)) {
    info('Create bots with @BotFather on Telegram');
    log(`\n    ${c.dim}Live:${c.reset}`);
    await collect('telegram-bot-token', 'Telegram LIVE bot token');
    log(`\n    ${c.dim}Test:${c.reset}`);
    await collect('telegram-test-bot-token', 'Telegram TEST bot token');
  } else {
    for (const name of ['telegram-bot-token', 'telegram-test-bot-token']) {
      if (!existing.includes(name)) {
        secrets[name] = 'placeholder';
        warn(`${name}: set to placeholder`);
      }
    }
  }

  return secrets;
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 7: Provision to GCP Secret Manager
// ═════════════════════════════════════════════════════════════════════════════

async function provision(
  allSecrets: Record<string, string>,
): Promise<string[]> {
  heading(7, 'Provisioning Secrets in GCP Secret Manager');

  const entries = Object.entries(allSecrets).filter(([, v]) => v);
  if (entries.length === 0) {
    info('No new secrets to provision.');
    return [];
  }

  info(`${entries.length} secrets to provision...\n`);

  // Refresh existing list
  const existing = listExistingSecrets();
  const provisioned: string[] = [];

  for (const [name, value] of entries) {
    if (existing.includes(name)) {
      // Secret already exists — only update if it was auto-generated or collected
      // (user explicitly provided it this session, so they want it updated)
    }

    try {
      createSecret(name, value, existing);
      provisioned.push(name);
    } catch (e: any) {
      fail(`Failed to provision ${name}: ${e.message}`);
    }
  }

  // Grant access
  log('');
  info('Granting Firebase App Hosting backend access...\n');
  for (const name of provisioned) {
    grantAppHostingAccess(name);
  }

  return provisioned;
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 8: Verification
// ═════════════════════════════════════════════════════════════════════════════

function verify(required: string[]): boolean {
  heading(8, 'Verification');

  const existing = listExistingSecrets();
  let allGood = true;
  let okCount = 0;
  let missingCount = 0;

  for (const name of required) {
    if (existing.includes(name)) {
      ok(name);
      okCount++;
    } else {
      fail(`${name} \u2014 MISSING`);
      missingCount++;
      allGood = false;
    }
  }

  log('');
  if (allGood) {
    log(
      `${c.bold}${c.green}All ${okCount} secrets are provisioned!${c.reset}`,
    );
    log('');
    log('Your next build should succeed. Trigger it with:');
    log(
      `  ${c.cyan}firebase apphosting:backends:deploy ${BACKEND_ID} --project ${PROJECT_ID}${c.reset}`,
    );
  } else {
    log(
      `${c.bold}${c.yellow}${okCount} provisioned, ${missingCount} still missing.${c.reset}`,
    );
    log('Re-run this script to fill in the remaining secrets.');
  }

  return allGood;
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 9: Optional .env.local for Local Development
// ═════════════════════════════════════════════════════════════════════════════

async function writeEnvLocal(
  allSecrets: Record<string, string>,
): Promise<void> {
  heading(9, 'Local Development (.env.local)');

  if (!(await askYesNo('Generate .env.local for local development?', false))) {
    info('Skipped.');
    return;
  }

  const envLocalPath = path.resolve(__dirname, '..', '.env.local');

  if (fs.existsSync(envLocalPath)) {
    if (!(await askYesNo('.env.local already exists. Overwrite?', false))) {
      info('Skipped.');
      return;
    }
  }

  // Read apphosting.yaml to build the mapping from variable name to secret name
  const yamlPath = path.resolve(__dirname, '..', 'apphosting.yaml');
  const yaml = fs.readFileSync(yamlPath, 'utf8');

  // Parse variable→secret and variable→value mappings
  const lines: string[] = [
    '# Auto-generated by scripts/setup-secrets.ts',
    `# Generated: ${new Date().toISOString()}`,
    '# DO NOT COMMIT THIS FILE',
    '',
  ];

  // Extract env entries from yaml
  const varRegex = /- variable:\s*(\S+)\s*\n\s*(?:secret:\s*(\S+)|value:\s*"?([^"\n]+)"?)/g;
  let m;
  while ((m = varRegex.exec(yaml)) !== null) {
    const varName = m[1];
    const secretName = m[2];
    const plainValue = m[3];

    if (secretName && allSecrets[secretName]) {
      lines.push(`${varName}=${allSecrets[secretName]}`);
    } else if (plainValue) {
      lines.push(`${varName}=${plainValue}`);
    }
  }

  fs.writeFileSync(envLocalPath, lines.join('\n') + '\n');
  ok(`Written: ${envLocalPath}`);
  warn('Remember: .env.local should be in .gitignore');
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  log('');
  log(
    `${c.bold}${c.magenta}  ____                  _ _     ____                 _       ${c.reset}`,
  );
  log(
    `${c.bold}${c.magenta} | __ ) _   _  __ _ _ _(_) |_  / ___|  ___  ___ _ __| |_ ___ ${c.reset}`,
  );
  log(
    `${c.bold}${c.magenta} |  _ \\| | | |/ _\` | '__| | __| \\___ \\ / _ \\/ __| '__| __/ __|${c.reset}`,
  );
  log(
    `${c.bold}${c.magenta} | |_) | |_| | (_| | |  | | |_   ___) |  __/ (__| |  | |_\\__ \\${c.reset}`,
  );
  log(
    `${c.bold}${c.magenta} |____/ \\__,_|\\__, |_|  |_|\\__| |____/ \\___|\\___|_|   \\__|___/${c.reset}`,
  );
  log(
    `${c.bold}${c.magenta}             |___/                                             ${c.reset}`,
  );
  log('');
  log(`${c.dim}  Secret Provisioning Agent for Firebase App Hosting${c.reset}`);
  log(`${c.dim}  Project: ${PROJECT_ID} | Backend: ${BACKEND_ID}${c.reset}`);
  if (FORCE_OVERWRITE) {
    log(`${c.bold}${c.yellow}  Mode: --force (overwrite existing secrets)${c.reset}`);
  }
  log('');

  initReadline();

  // Accumulate all secrets to provision
  const allSecrets: Record<string, string> = {};

  // Phase 1: Pre-flight
  const clis = preflight();
  if (!clis.gcloud) {
    fail('\ngcloud is required. Install and authenticate first.');
    process.exit(1);
  }

  // Phase 2: Discovery
  const { required, existing, missing } = discover();
  if (missing.length === 0 && !FORCE_OVERWRITE) {
    ok('\nAll secrets already exist! Use --force to overwrite.');
    verify(required);
    rl.close();
    return;
  }

  // Phase 3: Firebase SDK Config
  if (clis.firebase) {
    const firebaseSecrets = await getFirebaseConfig(existing);
    Object.assign(allSecrets, firebaseSecrets);
  }

  // Phase 4: Stripe
  if (clis.stripe) {
    const stripeSecrets = await setupStripe(existing);
    Object.assign(allSecrets, stripeSecrets);
  } else {
    warn('Stripe CLI not available \u2014 skipping product creation');
    info('Run "stripe login" and re-run this script to set up Stripe');
  }

  // Phase 5: Auto-generate crypto secrets
  const cryptoSecrets = generateCryptoSecrets(existing);
  Object.assign(allSecrets, cryptoSecrets);

  // Phase 6: Collect external credentials
  const credentials = await collectCredentials(existing);
  Object.assign(allSecrets, credentials);

  // Summary before provisioning
  const toProvision = Object.entries(allSecrets).filter(([, v]) => v);
  log('');
  log(`${c.bold}Summary${c.reset}`);
  log(`  Secrets to provision: ${c.bold}${toProvision.length}${c.reset}`);
  for (const [name] of toProvision) {
    log(`    ${c.cyan}${name}${c.reset}`);
  }
  log('');

  if (!(await askYesNo('Proceed with provisioning?'))) {
    warn('Aborted.');
    rl.close();
    return;
  }

  // Phase 7: Provision
  await provision(allSecrets);

  // Phase 8: Verify
  const allGood = verify(required);

  // Phase 9: Optional .env.local
  if (allGood) {
    await writeEnvLocal(allSecrets);
  }

  log('');
  log(`${c.bold}${c.green}Done!${c.reset}`);
  log('');

  rl.close();
}

main().catch((err) => {
  console.error(`\n${c.red}Fatal error:${c.reset}`, err.message);
  if (rl) rl.close();
  process.exit(1);
});
