import { useEffect, useRef, useState } from "react";
import { Formik, Form, useField } from "formik";
import { Button } from "../../components/ui/button";
import { FormField } from "../../components/ui/form-field";
import { Input } from "../../components/ui/input";
import { createSession } from "../../service/api/auth.api";
import { normalizeApiError } from "../../service/http-client";
import { loginSchema, signUpSchema } from "../../schema/auth";
import { submitRegistration } from "../../auth/registration-adapter";
import type { LoginRequest, RegistrationRequest } from "../../models/requests/auth";

type Mode = "signin" | "signup";

interface AuthOverlayProps { mode: Mode; onClose: () => void; onModeChange: (mode: Mode) => void; }

function TextField({ name, label, type = "text", autoComplete }: { name: string; label: string; type?: string; autoComplete?: string }) {
  const [field, meta] = useField(name);
  return <FormField label={label} required error={meta.touched ? meta.error : undefined}>
    {(control) => <Input {...control} {...field} type={type} className="sw-input" autoComplete={autoComplete} />}
  </FormField>;
}

function PasswordField({ name, label, showPassword, onToggle, autoComplete }: { name: string; label: string; showPassword: boolean; onToggle: () => void; autoComplete: string }) {
  const [field, meta] = useField(name);
  return <FormField label={label} required error={meta.touched ? meta.error : undefined}>
    {(control) => <div className="password-wrap"><Input {...control} {...field} type={showPassword ? "text" : "password"} className="sw-input" autoComplete={autoComplete} /><button type="button" className="password-toggle" onClick={onToggle}>{showPassword ? "Hide" : "Show"}</button></div>}
  </FormField>;
}

export function AuthOverlay({ mode, onClose, onModeChange }: AuthOverlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<string>();
  const [waking, setWaking] = useState(false);

  useEffect(() => { closeRef.current?.focus(); }, []);

  const signIn = async (values: LoginRequest) => {
    setStatus(undefined); setWaking(false);
    const timer = window.setTimeout(() => setWaking(true), 3000);
    try { await createSession(values); onClose(); }
    catch (error) { const problem = normalizeApiError(error); setStatus(problem.status === 401 ? "Those credentials do not match." : problem.detail ?? "We could not sign you in."); }
    finally { window.clearTimeout(timer); setWaking(false); }
  };

  const signUp = async (values: RegistrationRequest) => {
    setStatus(undefined);
    try { await submitRegistration(values); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Registration is not available yet."); }
  };

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-description">
      <button ref={closeRef} type="button" className="dialog-close" aria-label="Close authentication dialog" onClick={onClose}>×</button>
      <h2 id="auth-title">{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
      <p id="auth-description">{mode === "signin" ? "Sign in to keep your stock moving." : "Start keeping a clearer view of your shop."}</p>
      {status && <div className="status-banner" role="alert">{status}</div>}
      {waking && <div className="pending-note" role="status">The service is waking up…</div>}
      {mode === "signin" ? <Formik<LoginRequest> initialValues={{ email: "", password: "" }} validationSchema={loginSchema} onSubmit={signIn}>
        {({ isSubmitting, setValues }) => <Form className="auth-form" noValidate>
          <TextField name="email" label="Email" type="email" autoComplete="email" />
          <PasswordField name="password" label="Password" showPassword={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="current-password" />
          <Button type="submit" className="sw-button sw-button--primary" loading={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</Button>
          <div className="demo-grid" aria-label="Demo accounts">
            {(["Owner", "Assistant", "Admin"] as const).map((role) => <button className="demo-button" type="button" key={role} onClick={() => setValues({ email: `${role.toLowerCase()}@demo.stockwise.test`, password: "password" })}>{role}</button>)}
          </div>
          <button type="button" className="pending-note" onClick={() => onModeChange("signup")}>Need an account? Sign up</button>
        </Form>}
      </Formik> : <Formik<RegistrationRequest> initialValues={{ fullName: "", email: "", password: "" }} validationSchema={signUpSchema} onSubmit={signUp}>
        {({ isSubmitting }) => <Form className="auth-form" noValidate>
          <TextField name="fullName" label="Full name" autoComplete="name" />
          <TextField name="email" label="Email" type="email" autoComplete="email" />
          <PasswordField name="password" label="Password" showPassword={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />
          <Button type="submit" className="sw-button sw-button--primary" loading={isSubmitting}>{isSubmitting ? "Creating…" : "Create account"}</Button>
          <p className="pending-note">Account creation is pending API approval.</p>
          <button type="button" className="pending-note" onClick={() => onModeChange("signin")}>Already have an account? Sign in</button>
        </Form>}
      </Formik>}
    </section>
  </div>;
}
