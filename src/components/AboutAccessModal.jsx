import { useEffect, useRef, useState } from "react";
import "./AboutAccessModal.css";

export function AboutAccessModal({
  open,
  title = "Private Chapter",
  subtitle = "Enter password to continue",
  errorMessage = "",
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const [password, setPassword] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) setPassword("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="about-access-overlay" role="dialog" aria-modal="true">
      <div className="about-access-vignette" aria-hidden="true" />
      <div className="about-access-card">
        <div className="about-access-ornament" aria-hidden="true">
          ·&nbsp;&nbsp;✦&nbsp;&nbsp;·
        </div>
        <div className="about-access-eyebrow">restricted chapter</div>
        <h2 className="about-access-title">{title}</h2>
        <p className="about-access-subtitle">{subtitle}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (submitting) return;
            onSubmit(password);
          }}
          className="about-access-form"
        >
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="about-access-input"
            autoComplete="current-password"
            disabled={submitting}
          />

          {errorMessage ? (
            <p className="about-access-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="about-access-actions">
            <button
              type="button"
              onClick={onCancel}
              className="about-access-btn about-access-btn--ghost"
              disabled={submitting}
            >
              back
            </button>
            <button type="submit" className="about-access-btn" disabled={submitting}>
              {submitting ? "unlocking..." : "unlock ✦"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
