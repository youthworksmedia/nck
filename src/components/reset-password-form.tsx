"use client";

import { Save, UserPlus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { PasswordInput } from "@/components/password-input";
import { isStrongPassword, passwordRequirementText } from "@/lib/password";
import { hasSupabaseEnv } from "@/lib/public-env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ResetPasswordMode = "invite" | "recovery";

export function ResetPasswordForm({ mode }: { mode: ResetPasswordMode }) {
  const searchParams = useSearchParams();
  const isInviteMode = mode === "invite";
  const unavailableLinkMessage = isInviteMode
    ? "This account invitation link is missing or has expired. Ask your account holder to send you a new invitation."
    : "This password reset link is missing or has expired. Request a new password reset email.";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setIsCheckingSession(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    let isMounted = true;

    const markReadyFromSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session && tokenHash && (type === "recovery" || type === "invite")) {
        const { data: verificationData, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type
        });

        if (!isMounted) {
          return;
        }

        if (error) {
          setIsRecoveryReady(false);
          setIsCheckingSession(false);
          setMessage(unavailableLinkMessage);
          return;
        }

        setIsRecoveryReady(Boolean(verificationData.session));
        setIsCheckingSession(false);
        return;
      }

      if (!isMounted) {
        return;
      }

      setIsRecoveryReady(Boolean(data.session));
      setIsCheckingSession(false);
    };

    void markReadyFromSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setIsRecoveryReady(Boolean(session));
        setIsCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams, unavailableLinkMessage]);

  return (
    <form
      className="panel login-panel"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("");

        startTransition(async () => {
          if (!hasSupabaseEnv) {
            setMessage("Add Supabase environment variables to enable password updates.");
            return;
          }

          if (!isStrongPassword(password)) {
            setMessage(passwordRequirementText);
            return;
          }

          if (isInviteMode && name.trim().length < 2) {
            setMessage("Enter your name.");
            return;
          }

          if (password !== confirmPassword) {
            setMessage("The passwords do not match.");
            return;
          }

          const supabase = createSupabaseBrowserClient();
          const {
            data: { session }
          } = await supabase.auth.getSession();

          if (!session) {
            setMessage(unavailableLinkMessage);
            return;
          }

          const { error } = await supabase.auth.updateUser({
            password,
            data: isInviteMode ? { full_name: name.trim() } : undefined
          });

          if (error) {
            setMessage(error.message);
            return;
          }

          if (isInviteMode) {
            const profileResponse = await fetch("/api/auth/invite-profile", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ name: name.trim() })
            });

            if (!profileResponse.ok) {
              const payload = await profileResponse.json();
              setMessage(payload.message || "Your password was saved, but your name could not be updated.");
              return;
            }
          }

          setIsComplete(true);
          setMessage(
            isInviteMode
              ? "Your account is ready. You can now log in with your email address and new password."
              : "Your password has been updated. You can now log in with the new password."
          );
        });
      }}
    >
      <div className="login-head">
        <h1>{isInviteMode ? "Create your account" : "Reset your password"}</h1>
        <p>
          {isInviteMode
            ? "New account. Add your name and choose a password to finish joining your church account."
            : "Enter a new password for your existing New Creation Kids account."}
        </p>
      </div>
      {!isRecoveryReady ? (
        <p className="form-status">
          {isCheckingSession
            ? isInviteMode
              ? "Checking your invitation link..."
              : "Checking your reset link..."
            : unavailableLinkMessage}
        </p>
      ) : null}
      <div className="login-fields">
        {isInviteMode ? (
          <>
            <label htmlFor="invite-name">Your name</label>
            <input
              id="invite-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              minLength={2}
              required
              disabled={isComplete || !isRecoveryReady}
            />
          </>
        ) : null}
        <label htmlFor="new-password">{isInviteMode ? "Password" : "New password"}</label>
        <PasswordInput
          id="new-password"
          value={password}
          onChange={setPassword}
          placeholder={isInviteMode ? "Password" : "New password"}
          minLength={8}
          required
          disabled={isComplete || !isRecoveryReady}
        />
        <label htmlFor="confirm-new-password">Confirm new password</label>
        <PasswordInput
          id="confirm-new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Repeat password"
          minLength={8}
          required
          disabled={isComplete || !isRecoveryReady}
        />
      </div>
      <p className="form-status form-status-small">{passwordRequirementText}</p>
      <button
        type="submit"
        className="button button-primary login-submit-button"
        disabled={isPending || isComplete || !isRecoveryReady}
      >
        {isInviteMode ? <UserPlus size={16} /> : <Save size={16} />}
        <span>
          {isInviteMode
            ? isPending
              ? "Creating..."
              : "Create"
            : isPending
              ? "Saving..."
              : "Save new password"}
        </span>
      </button>
      {message ? <p className="form-status">{message}</p> : null}
      {isComplete ? (
        <Link href="/login" className="button button-secondary login-submit-button">
          Go to login
        </Link>
      ) : null}
    </form>
  );
}
