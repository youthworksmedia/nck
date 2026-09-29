# Behind the Scenes

This guide explains how the New Creation Kids app works in plain English.

## Core Idea

The app sells an annual membership. After checkout, the customer receives an organisation account, a subscription, and access to member resources. The account holder can invite other team members into the same organisation.

The admin console manages the content, products, customer records, discounts, transactions, and global settings that support that membership.

## Main Presets

The app has three built-in product tiers:

- Small: 1-49 kids.
- Medium: 50-99 kids.
- Large: 100+ kids.

The database still uses stable internal tier keys for existing records, subscriptions, orders, discounts, and gateway mapping. Staff and customer-facing screens should use the product names Small, Medium, and Large. Admins can change the customer-facing title, kids ministry size range, summary, AUD price, and Stripe price ID, but the internal tier keys stay the same.

The default currency is AUD. The product data model has room for NZD, USD, and GBP later, but the current active admin flow is AUD.

## Payment Gateway Assumption

The intended production model is a Stripe-style payment gateway.

Behind the scenes, checkout is expected to:

1. Identify the selected product tier.
2. Apply a valid discount if supplied.
3. Calculate subtotal, GST if applicable, and total.
4. Send the payment to the gateway.
5. Receive a successful payment result.
6. Create a purchase order or invoice record.
7. Create or update the customer organisation.
8. Create or update the subscription.
9. Give the account holder access.

Development or staging environments may use dummy card handling so the team can test the flow without charging real cards. Manuals and staff training should still describe the business process as the real payment gateway flow.

## GST and Billing

The billing helper checks the billing country.

Australian billing countries apply a 10% GST calculation. Non-Australian billing countries do not apply Australian GST.

Invoices and transaction records store billing address details, payment status, provider, card brand, last four digits, total, discount amount, and plan tier.

## Content Publishing

Lesson content is stored by curriculum year or volume and term.

Each lesson has:

- Title.
- Description.
- Scripture.
- Big Idea.
- Optional podcast links.
- Publish date.
- Optional expiry date.
- Published or closed status.
- Attached school-age and preschool files.

Published content appears when it is open, in date, and available to the member area. Closed or expired content is treated as inactive.

## File Storage

Resource files are uploaded into storage and connected to content records.

The app can show file availability for:

- Manuals.
- Worksheets.
- Music.
- Other attachments.
- Preschool attachments.

Editors should treat uploaded files as shared assets. Replacing or removing files can affect any lesson or page that links to them.

## Accounts and Access

The main customer record is an organisation.

An organisation has:

- One account holder owner.
- Optional invited team members.
- A subscription.
- A selected product tier.

Admin access is separate from customer access. Admin users are stored in the admin roles area and can access `/admin`.

## Discounts

Discounts are stored separately from products and orders.

A discount can define:

- Code.
- Description.
- Eligible plan tiers.
- Percent or fixed amount.
- Value.
- Uses per account.
- Start date.
- End date.
- Active status.

When a customer enters a discount code, checkout validates those rules before reducing the price.

## Transactions

A transaction record is the internal history of checkout activity.

The admin transaction table shows:

- Order or invoice number.
- Account holder.
- Church.
- Plan.
- Amount.
- Currency.
- Payment status.
- Payment provider.
- Card brand and last four digits.
- Billing address.
- Discount details.
- Purchase date.

This is the first place sales or admins should check when a customer asks whether payment went through.

## Settings and Emails

Global settings control:

- Offline mode.
- Site URL used in email links.
- Sender name and sender email.
- Support email.
- Renewal reminders.
- Cancellation survey URL.
- Dashboard welcome messages.
- Homepage content.
- Email templates.

Email templates use merge codes. When an email is sent, the app replaces those codes with account, invitation, renewal, or support details.

## Performance Logs

The app records page load timing events for admin review.

Performance logs help answer:

- Which pages are slow?
- How many samples have been captured?
- What was the worst recent load time?
- Which paths should developers inspect first?

## Practical Rule

If a staff member changes something in admin, assume it may affect one of four customer-facing areas:

- What customers can buy.
- What customers can access.
- What customers can download.
- What customers receive by email.

Check the matching customer-facing page after important changes.
