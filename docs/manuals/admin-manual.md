# Admin Manual

This manual is for New Creation Kids staff who manage the whole platform.

## Signing In

1. Go to the admin login route.
2. Sign in with an admin account.
3. Open `/admin`.

Only users listed as admins can access the admin console. If a signed-in user is not an admin, the app sends them back to the member area.

## Admin Console Overview

The admin console is the control centre for:

- Curriculum and downloadable lesson content.
- Leader resources, games, and image library entries.
- Family resources.
- Ministry leader resources.
- Products and pricing.
- Customer accounts and invited team members.
- Discounts.
- Transactions and payment records.
- Uploaded media files.
- Performance logs.
- Website, dashboard, homepage, and email settings.

The overview page shows current counts for lessons, products, account holders, invited sub accounts, paid transactions, and media access.

## Products

Use `Products` to manage the customer-facing subscription plans.

The current preset product tiers are:

- Small: 1-49 kids.
- Medium: 50-99 kids.
- Large: 100+ kids.

Each product has:

- Title.
- Kids ministry size range.
- AUD price.
- Stripe price ID.
- Summary text shown to customers.

When you save a product, the app updates the product record used by pricing and checkout. The product tier itself stays fixed, but the public title, description, amount, and gateway price ID can change.

## Accounts

Use `Accounts` to manage customer organisations and admin users.

The `Account holders` tab shows:

- Account holder name and email.
- Church name.
- Product plan.
- Subscription status.
- Joined date.
- Invited sub accounts.

Open an account row to view its invited team members. Admins can remove sub accounts when required.

The `Admin` tab manages staff with admin access. Add only trusted staff here because admins can change prices, customer records, content, discounts, settings, and other admins.

## Discounts

Use `Discounts` to create checkout discount codes.

Each discount includes:

- Code.
- Description.
- Eligible products.
- Discount type: percent or fixed amount.
- Discount value.
- Uses per account.
- Start date.
- Optional end date.
- Active status.

Discount codes are checked during checkout. A code only applies if it is active, within its date window, valid for the selected product, and still under its usage rules.

## Transactions

Use `Transactions` to review purchase and payment records.

Each transaction shows:

- Order or invoice number.
- Account holder.
- Plan.
- Total.
- Purchase date.
- Payment status.
- Payment provider.
- Card brand and last four digits.
- Billing address.
- Discount details, if used.

Production procedures should treat this as Stripe-backed payment data. Test environments may show dummy gateway data, but staff should not describe it to customers as a dummy payment system.

## Settings

Use `Settings` to manage site-wide behaviour.

General settings include:

- Offline mode.
- Website URL used in emails.
- Sender name.
- Sender email.
- Support email.
- Renewal reminder timing.
- Cancellation survey URL.

Dashboard settings control customer dashboard welcome messages.

Homepage settings control editable homepage content.

Email settings control email templates and merge codes used in outgoing messages.

Be careful with offline mode. Turning it on temporarily hides the normal frontend experience.

## Performance

Use `Performance` to review page load timing logs.

This is mainly useful when staff report that a page feels slow. The page shows recent timing samples, tracked routes, average load times, and worst route timings.

## Admin Safety Checklist

Before changing products, prices, discounts, or email settings:

- Confirm the change has been approved.
- Check whether the change affects existing subscriptions or only new checkouts.
- Confirm the Stripe price ID matches the intended live product.
- Test the customer-facing page after saving.
- Keep a short note of what changed and when.
