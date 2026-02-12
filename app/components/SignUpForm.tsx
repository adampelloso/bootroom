"use client";

import { useState } from "react";

const INIT = "INIT";
const SUBMITTING = "SUBMITTING";
const ERROR = "ERROR";
const SUCCESS = "SUCCESS";
type FormState = typeof INIT | typeof SUBMITTING | typeof ERROR | typeof SUCCESS;

const FORM_ID = "cmk759h8y0gpv0i18cooqj7vh";
const USER_GROUP = "bootroom";
const DOMAIN = "app.loops.so";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>(INIT);
  const [errorMessage, setErrorMessage] = useState("");

  const resetForm = () => {
    setEmail("");
    setFormState(INIT);
    setErrorMessage("");
  };

  const hasRecentSubmission = () => {
    const timestamp = Date.now();
    const prev = localStorage.getItem("loops-form-timestamp");
    if (prev && Number(prev) + 60_000 > timestamp) {
      setFormState(ERROR);
      setErrorMessage("Too many signups, please try again in a little while");
      return true;
    }
    localStorage.setItem("loops-form-timestamp", timestamp.toString());
    return false;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formState !== INIT) return;
    if (!/\S+@\S+/.test(email)) {
      setFormState(ERROR);
      setErrorMessage("Please enter a valid email");
      return;
    }
    if (hasRecentSubmission()) return;
    setFormState(SUBMITTING);

    const body = `userGroup=${encodeURIComponent(USER_GROUP)}&email=${encodeURIComponent(email)}&mailingLists=`;

    fetch(`https://${DOMAIN}/api/newsletter-form/${FORM_ID}`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
      .then((res) => {
        if (res.ok) {
          resetForm();
          setFormState(SUCCESS);
        } else {
          res.json().then((data) => {
            setFormState(ERROR);
            setErrorMessage(data.message || res.statusText);
            localStorage.setItem("loops-form-timestamp", "");
          });
        }
      })
      .catch((err) => {
        setFormState(ERROR);
        setErrorMessage(
          err.message === "Failed to fetch"
            ? "Too many signups, please try again in a little while"
            : err.message || "Something went wrong"
        );
        localStorage.setItem("loops-form-timestamp", "");
      });
  };

  if (formState === SUCCESS) {
    return (
      <p
        style={{
          fontFamily: "var(--font-mono)",
          color: "#fff",
          fontSize: "14px",
          letterSpacing: "0.04em",
        }}
      >
        You're on the list.
      </p>
    );
  }

  if (formState === ERROR) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <p style={{ fontFamily: "var(--font-mono)", color: "#EF4444", fontSize: "13px" }}>
          {errorMessage || "Something went wrong, please try again"}
        </p>
        <button
          onClick={resetForm}
          style={{
            fontFamily: "var(--font-mono)",
            color: "#737373",
            fontSize: "13px",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        width: "100%",
        maxWidth: "380px",
        gap: "0",
      }}
    >
      <input
        type="email"
        name="email"
        placeholder="gaffer@bootroom.gg"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{
          flex: 1,
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          color: "#fff",
          background: "#141414",
          border: "1px solid #333",
          borderRight: "none",
          padding: "10px 14px",
          outline: "none",
          minWidth: 0,
        }}
      />
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <button
        type="submit"
        disabled={formState === SUBMITTING}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          fontWeight: 600,
          color: "#000",
          background: "#fff",
          border: "1px solid #fff",
          padding: "10px 20px",
          cursor: formState === SUBMITTING ? "wait" : "pointer",
          whiteSpace: "nowrap",
          letterSpacing: "0.02em",
        }}
      >
        {formState === SUBMITTING ? "..." : "Get access"}
      </button>
    </form>
  );
}
