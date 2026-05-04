"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, CreditCard, LockKeyhole, ShieldCheck, ShoppingBag } from "lucide-react";

import { PasswordInput } from "@/components/password-input";
import { acceptedFakeCards, detectCardBrandFromPrefix } from "@/lib/checkout";
import { countries, inferCountryFromBrowser } from "@/lib/countries";
import { isStrongPassword, passwordRequirementText } from "@/lib/password";
import type { Plan } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

type Props = {
  plan: Plan;
  defaults?: {
    accountHolderName?: string;
    churchName?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  isSignedInOwner: boolean;
};

export function CheckoutForm({
  plan,
  defaults,
  isSignedInOwner
}: Props) {
  const [accountHolderName, setAccountHolderName] = useState(defaults?.accountHolderName ?? "");
  const [churchName, setChurchName] = useState(defaults?.churchName ?? "");
  const [email, setEmail] = useState(defaults?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [addressLine1, setAddressLine1] = useState(defaults?.addressLine1 ?? "");
  const [suburb, setSuburb] = useState(defaults?.suburb ?? "");
  const [stateName, setStateName] = useState(defaults?.state ?? "");
  const [postcode, setPostcode] = useState(defaults?.postcode ?? "");
  const [country, setCountry] = useState(defaults?.country ?? "Australia");
  const [countryTouched, setCountryTouched] = useState(Boolean(defaults?.country));
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [nameOnCard, setNameOnCard] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("12");
  const [expiryYear, setExpiryYear] = useState(String(new Date().getFullYear() + 1));
  const [cvc, setCvc] = useState("123");
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [message, setMessage] = useState(
    "Use one of the fake test cards below to complete checkout while Stripe is not connected."
  );
  const [isPending, startTransition] = useTransition();

  const cardExamples = useMemo(
    () => acceptedFakeCards.map((card) => `${card.brand}: ${card.number}`).join("  •  "),
    []
  );
  const detectedCardBrand = useMemo(() => detectCardBrandFromPrefix(cardNumber), [cardNumber]);

  useEffect(() => {
    if (countryTouched) {
      return;
    }

    setCountry(defaults?.country || inferCountryFromBrowser());
  }, [countryTouched]);

  return (
    <div className="checkout-layout">
      <form
        className="panel checkout-form"
        onSubmit={(event) => {
          event.preventDefault();

          startTransition(async () => {
            if (!accountHolderName.trim()) {
              setMessage("Add the account holder name.");
              return;
            }

            if (!churchName.trim()) {
              setMessage("Add the church name.");
              return;
            }

            if (!email.trim()) {
              setMessage("Add the account email address.");
              return;
            }

            if (!isSignedInOwner) {
              if (!isStrongPassword(password)) {
                setMessage(passwordRequirementText);
                return;
              }

              if (password !== confirmPassword) {
                setMessage("Passwords do not match.");
                return;
              }
            }

            if (!acceptTerms) {
              setMessage("Please confirm the annual subscription purchase.");
              return;
            }

            const response = await fetch("/api/checkout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                tier: plan.id,
                accountHolderName,
                churchName,
                email,
                password,
                phone,
                addressLine1,
                suburb,
                state: stateName,
                postcode,
                country,
                cardNumber,
                nameOnCard,
                expiryMonth,
                expiryYear,
                cvc
              })
            });

            const payload = (await response.json()) as {
              message?: string;
              redirectTo?: string;
              requiresSignIn?: boolean;
            };

            if (!response.ok) {
              setMessage(payload.message ?? "Checkout could not be completed.");
              return;
            }

            if (payload.requiresSignIn) {
              const supabase = createSupabaseBrowserClient();
              const { error } = await supabase.auth.signInWithPassword({
                email,
                password
              });

              if (error) {
                setMessage(
                  `${payload.message ?? "Purchase completed."} Your account was created, but automatic sign-in failed. Please sign in manually.`
                );
                return;
              }
            }

            window.location.href = payload.redirectTo ?? "/account?checkout=success";
          });
        }}
      >
        <div className="checkout-head">
          <span className="eyebrow">Secure checkout</span>
          <h1>{plan.name} annual membership</h1>
          <p>
            Full curriculum access with a smoother account setup. This checkout is running in
            safe test mode until Stripe is connected.
          </p>
        </div>

        <section className="checkout-section">
          <div className="checkout-section-head">
            <ShoppingBag size={18} />
            <div>
              <h2>Account details</h2>
              <p>{isSignedInOwner ? "We will renew your existing account." : "Create the account as part of checkout."}</p>
            </div>
          </div>
          <div className="checkout-grid">
            <label>
              Account holder name
              <input value={accountHolderName} onChange={(event) => setAccountHolderName(event.target.value)} required />
            </label>
            <label>
              Church
              <input value={churchName} onChange={(event) => setChurchName(event.target.value)} required />
            </label>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                readOnly={isSignedInOwner}
              />
            </label>
            <label>
              Phone
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" />
            </label>
          </div>
          {!isSignedInOwner ? (
            <div className="checkout-grid">
              <label>
                Password
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder="8+ chars, number, symbol"
                  minLength={8}
                  required
                />
              </label>
              <label>
                Confirm password
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repeat password"
                  minLength={8}
                  required
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="checkout-section">
          <div className="checkout-section-head">
            <ShieldCheck size={18} />
            <div>
              <h2>Billing details</h2>
              <p>This is what super admin will see on the purchase record.</p>
            </div>
          </div>
          <div className="checkout-grid">
            <label className="checkout-span-2">
              Address
              <input
                value={addressLine1}
                onChange={(event) => setAddressLine1(event.target.value)}
                placeholder="Street address"
                autoComplete="address-line1"
                required
              />
            </label>
            <label>
              Suburb / City
              <input
                value={suburb}
                onChange={(event) => setSuburb(event.target.value)}
                autoComplete="address-level2"
                required
              />
            </label>
            <label>
              State
              <input
                value={stateName}
                onChange={(event) => setStateName(event.target.value)}
                autoComplete="address-level1"
                required
              />
            </label>
            <label>
              Postcode
              <input
                value={postcode}
                onChange={(event) => setPostcode(event.target.value)}
                autoComplete="postal-code"
                required
              />
            </label>
            <label>
              Country
              <select
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  setCountryTouched(true);
                }}
                autoComplete="country-name"
                required
              >
                {countries.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="checkout-address-help">
            Start typing and your browser can suggest saved addresses. You can still fill in the
            fields manually any time.
          </p>
        </section>

        <section className="checkout-section">
          <div className="checkout-section-head">
            <CreditCard size={18} />
            <div>
              <h2>Payment</h2>
              <p>Safe test mode. Use fake card details for a successful purchase.</p>
            </div>
          </div>
          <div className="checkout-card-help">
            <strong>Accepted test cards:</strong> {cardExamples}
          </div>
          <div className="checkout-grid">
            <label className="checkout-span-2">
              Card number
              <span className="checkout-card-field">
                <input
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  required
                />
                <span className="checkout-card-type" aria-live="polite">
                  <CreditCard size={14} />
                  <span>{detectedCardBrand || "Card"}</span>
                </span>
              </span>
            </label>
            <label>
              Name on card
              <input value={nameOnCard} onChange={(event) => setNameOnCard(event.target.value)} required />
            </label>
            <label>
              Security code
              <input inputMode="numeric" value={cvc} onChange={(event) => setCvc(event.target.value)} required />
            </label>
            <label>
              Expiry month
              <input inputMode="numeric" value={expiryMonth} onChange={(event) => setExpiryMonth(event.target.value)} required />
            </label>
            <label>
              Expiry year
              <input inputMode="numeric" value={expiryYear} onChange={(event) => setExpiryYear(event.target.value)} required />
            </label>
          </div>
        </section>

        <label className="checkout-consent">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
          />
          <span>I understand this creates or renews an annual subscription for this account.</span>
        </label>

        <button className="button button-primary checkout-submit" type="submit" disabled={isPending}>
          <LockKeyhole size={16} />
          <span>{isPending ? "Completing purchase..." : `Complete purchase · ${formatCurrency(plan.annualPrice)}`}</span>
        </button>
        <p className="form-status">{message}</p>
      </form>

      <aside className="panel checkout-summary">
        <span className="eyebrow">Order summary</span>
        <h2>{plan.name}</h2>
        <p>{plan.audience}</p>
        <div className="checkout-summary-price">
          <strong>{formatCurrency(plan.annualPrice)}</strong>
          <span>per year</span>
        </div>
        <ul className="feature-list">
          <li>Full curriculum library included</li>
          <li>{plan.studentRange}</li>
          <li>Unlimited invited team accounts included</li>
          <li>Owner account created during checkout</li>
          <li>Super admin order record created automatically</li>
        </ul>
        <div className="checkout-trust">
          <CheckCircle2 size={16} />
          <p>Ready for Stripe later. Running on a fake-card checkout path right now.</p>
        </div>
      </aside>
    </div>
  );
}
