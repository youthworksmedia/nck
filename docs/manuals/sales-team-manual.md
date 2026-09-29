# Sales Team Manual

This manual is for staff helping churches choose a plan, complete payment, understand discounts, and manage account questions.

## What Customers Are Buying

New Creation Kids is an annual content membership. A customer account receives access to the same core resource library, with pricing based on ministry size.

The current preset plans are:

- Small: 1-49 kids.
- Medium: 50-99 kids.
- Large: 100+ kids.

The plans include:

- Full library of downloadable resources.
- Unlimited invited account access.
- Invoices and order history.
- Shared curriculum access tied to one active annual subscription.
- Secure login and account management.

## Choosing the Right Plan

Ask the customer how many kids they regularly serve.

Recommend:

- Small for 1-49 kids.
- Medium for 50-99 kids.
- Large for 100+ kids.

If a church is between sizes, recommend the plan that reflects their normal ministry size across the year.

## Payment Gateway

Sales conversations should describe checkout as card payment through the live payment gateway, such as Stripe.

In production:

- The customer chooses a plan.
- The checkout calculates the price.
- A discount is applied if valid.
- The customer enters billing and card details.
- The payment gateway authorises the payment.
- The app records the order, invoice, subscription, and account access.

Local or demo environments may show test payment behaviour. Do not describe this as the real customer payment process.

## Discounts

Discount codes can be created by admins.

A code may be limited by:

- Product plan.
- Percent or fixed amount.
- Start date.
- End date.
- Uses per account.
- Active or inactive status.

If a customer says a code does not work, check:

- The spelling of the code.
- Whether the code is active.
- Whether the code applies to the selected plan.
- Whether the code has started or expired.
- Whether the account has already used it.

## Account Holders and Team Members

Each paying customer has an account holder. The account holder can invite team members.

The admin account screen shows:

- Account holder name and email.
- Church name.
- Plan.
- Subscription status.
- Invited team members.

Team member access belongs to the customer organisation. Removing a team member does not cancel the customer subscription.

## Transactions and Invoices

Use `Transactions` to confirm payment records.

Useful details include:

- Invoice or order number.
- Payment status.
- Plan.
- Total.
- Discount used.
- Card brand and last four digits.
- Billing address.
- Purchase date.

If the payment status is paid, the account should have active access unless there is a separate account setup issue.

## Common Customer Questions

### Can I invite my team?

Yes. A customer account can invite team members so staff and volunteers can access shared resources.

### Do all plans include the same resources?

Yes. The plan tiers are based on ministry size, not reduced content access.

### Can we get an invoice?

Yes. Orders and invoices are recorded against the account and can be accessed from the account area.

### What happens after payment?

The app creates or updates the organisation, records the subscription, stores the order, and gives the account holder access to the member area.

### Why is GST shown?

Australian billing addresses include GST handling. Non-Australian billing addresses do not apply Australian GST in the same way.

## Sales Checklist

When helping a customer:

- Confirm their church name and account holder email.
- Confirm the correct plan tier.
- Confirm any discount code before payment.
- Ask them to keep their invoice/order number.
- Check the transaction record if they report a payment issue.
- Check account status if they report an access issue.
