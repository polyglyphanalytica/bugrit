# Pricing Page Security Implementation

**Requirement**: Move pricing from public pages to protected area (auth required)

---

## Current State

### Public Routes (Anyone Can Access)
- `/pricing` - Public pricing page
- `/api/docs/pricing` - Public API documentation
- `/` (landing) - May reference pricing

### Protected Routes (Auth Required)
- `/settings/subscription` - User subscription management
- `/settings/billing` - Billing and payment methods

---

## Implementation Plan

### Step 1: Create Protected Pricing Page

**File**: `src/app/settings/pricing/page.tsx`

```typescript
'use client';

import { useAuth } from '@/contexts/auth-context';
import { redirect } from 'next/navigation';
import PricingPageContent from '@/components/pricing-page-content';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function PricingPageSkeleton() {
  return <div>Loading pricing...</div>;
}

export default function SettingsPricingPage() {
  const { user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return <PricingPageSkeleton />;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    redirect('/login?redirectTo=/settings/pricing');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plans & Pricing</h1>
        <p className="text-gray-600 mt-2">
          Choose the perfect plan for your needs
        </p>
      </div>

      <Suspense fallback={<PricingPageSkeleton />}>
        <PricingPageContent />
      </Suspense>
    </div>
  );
}
```

### Step 2: Redirect Public Pricing Page

**File**: `src/app/pricing/page.tsx` (Modified)

```typescript
import { redirect } from 'next/navigation';

export default function RedirectPricingPage() {
  // Redirect to protected pricing page
  redirect('/settings/pricing');
}
```

### Step 3: Update Navigation Links

**Files to update**:
- `src/components/header.tsx` - Update "Pricing" link in nav
- `src/components/footer.tsx` - Update pricing link
- `src/app/page.tsx` (landing) - Update CTA button
- Any other components linking to `/pricing`

**Change**:
```typescript
// Before
href="/pricing"

// After (for authenticated users)
href="/settings/pricing"

// OR for landing page
href={user ? "/settings/pricing" : "/signup?redirectTo=/settings/pricing"}
```

### Step 4: Update Public Landing Page

**File**: `src/app/page.tsx`

```typescript
// For unauthenticated users on landing:
// - Show pricing tiers (summary only, no prices)
// - CTA: "View Full Pricing" → redirects to login/signup

// For authenticated users:
// - Direct link to /settings/pricing
```

### Step 5: Protect Settings Layout

**File**: `src/app/settings/layout.tsx` (Verify)

```typescript
// Should already have auth check
export default async function SettingsLayout() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return <SettingsLayoutContent />;
}
```

---

## Security Benefits

✅ **Hide Pricing Strategy**
- Competitors can't easily scrape pricing
- Pricing changes don't leak to public
- Pricing tiers remain confidential

✅ **Know Your Audience**
- Only authenticated users see full pricing
- Unauthenticated users see value proposition
- Can personalize pricing per user

✅ **Encourage Signup**
- "View Pricing" becomes "Sign Up to See Plans"
- Increases conversion to signups
- Users can't comparison shop without account

✅ **Analytics**
- Track which authenticated users view pricing
- Identify price sensitivity
- A/B test different pricing strategies

✅ **Enterprise Contracts**
- Enterprise pricing hidden from public
- Custom pricing per customer
- Prevents public underpricing

---

## Implementation Steps

### 1. Move the pricing component

```bash
# Create protected route
mkdir -p src/app/settings/pricing

# Copy pricing page content
cp src/app/pricing/page.tsx src/app/settings/pricing/page.tsx

# Modify to add auth check
# Update links in settings navigation
```

### 2. Update all links

```typescript
// Global search and replace:
// /pricing → /settings/pricing
// (or use conditional based on auth state)
```

### 3. Update documentation

**Files**:
- `README.md` - Update navigation docs
- API docs - Note pricing is auth-required
- User guide - Update screenshots

### 4. Communicate to users

- Email announcement: "Pricing moved to settings for easier access"
- Update help docs
- In-app notification

---

## Testing Checklist

- [ ] Unauthenticated user → `/pricing` → redirected to `/login`
- [ ] Authenticated user → `/pricing` → redirected to `/settings/pricing`
- [ ] Authenticated user → `/settings/pricing` → shows full pricing
- [ ] All header/footer links updated
- [ ] Landing page links correct
- [ ] API docs still accessible (different URL)
- [ ] Mobile navigation works
- [ ] Redirect preserves query params if any

---

## Rollback Plan

If needed to revert:
1. Restore public `/pricing` route
2. Update links back to public URLs
3. Remove auth check from settings pricing
4. Update docs

---

## Configuration

### Environment Variables (if needed)
```env
# No additional env vars needed
# Uses existing auth context
```

### Database Changes
```
No database changes needed
```

---

## Files Modified

1. ✅ `src/app/pricing/page.tsx` - Redirect to protected page
2. ✅ `src/app/settings/pricing/page.tsx` - New protected page
3. ⚠️ `src/components/header.tsx` - Update navigation
4. ⚠️ `src/components/footer.tsx` - Update footer links
5. ⚠️ `src/app/page.tsx` - Update landing page CTA
6. ⚠️ Various component links to pricing

---

## Conclusion

This change moves pricing information behind authentication, providing:
- Better competitive positioning
- Increased user signups
- Protected pricing strategy
- Personalization opportunities

**Implementation Time**: 30-60 minutes
**Complexity**: Low (mostly link updates)
**Risk**: Very Low (redirect preserves functionality)
