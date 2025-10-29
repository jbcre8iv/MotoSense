# Enable Leaked Password Protection

## What is this?

Leaked Password Protection checks user passwords against a database of known compromised passwords from data breaches. This prevents users from using passwords that have been exposed in security breaches.

## How to Enable

**Step 1:** Go to your Supabase Dashboard
- URL: https://supabase.com/dashboard/project/mtpyzuzvjizcostbwsg/auth/providers

**Step 2:** Scroll down to "Security and Protection"
- Look for **"Leaked Password Protection"** section

**Step 3:** Enable the toggle
- Turn ON the **"Leaked Password Protection"** switch

**Step 4:** Save changes
- Click **"Save"** at the bottom of the page

## What This Does

When enabled:
- New sign-ups with compromised passwords will be rejected
- Password changes to compromised passwords will be rejected
- Existing users with compromised passwords can still log in but should be prompted to change their password

## Recommendation

**Enable this immediately.** It's a simple toggle with no code changes needed and significantly improves your app's security.

## After Enabling

Go back to Security Advisor and click **Refresh**. The "Leaked Password Protection Disabled" warning should disappear.
