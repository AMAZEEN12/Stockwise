import { useEffect, useRef, useState } from 'react';
import { useFormik } from 'formik';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { FormField } from '../../components/ui/form-field';
import { Input } from '../../components/ui/input';
import { loginSchema, registrationSchema } from '../../schema/auth.schema';
import { useCreateSessionMutation } from '../../service/api/auth.api';
import type { HttpError } from '../../service/http-client';
import { saveSession } from '../../auth/session';
import { registrationAvailability } from '../../auth/registration-adapter';
import {store} from '../../app/store/store';
import {authApi} from '../../service/api/auth.api';

type Status = 'idle' | 'loading' | 'waking' | 'error-401' | 'error-network' | 'registration-pending';
type PendingRequest = ReturnType<ReturnType<typeof useCreateSessionMutation>[0]>;

export function SignInPage() { return <AuthOverlay mode="sign-in" />; }
export function SignUpPage() { return <AuthOverlay mode="sign-up" />; }

export function AuthOverlay({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const isSignUp = mode === 'sign-up';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [demoNotice, setDemoNotice] = useState('');
  const [createSession] = useCreateSessionMutation();
  const pendingRequest = useRef<PendingRequest | null>(null);
  const wakeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(wakeTimer.current); pendingRequest.current?.abort(); };
  }, []);
  const busy = status === 'loading' || status === 'waking';
  const form = useFormik({
    initialValues: { displayName: '', email: '', password: '' },
    validationSchema: isSignUp ? registrationSchema : loginSchema,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      if (pendingRequest.current) return;
      if (isSignUp) { setStatus('registration-pending'); return; }
      setStatus('loading');
      setDemoNotice('');
      wakeTimer.current = setTimeout(() => { if (mounted.current) setStatus('waking'); }, 3000);
      const request = createSession({ email: values.email.trim(), password: values.password });
      pendingRequest.current = request;
      try {
        const session = await request.unwrap();
        if (!mounted.current) return;
        store.dispatch(authApi.util.resetApiState());
        saveSession(session);
        const returnTo = searchParams.get('returnTo');
        await navigate(returnTo ? `/app?returnTo=${encodeURIComponent(returnTo)}` : '/app', { replace: true });
      } catch (caught) {
        if (!mounted.current) return;
        const error = caught as HttpError;
        if ((error.status === 400 || error.status === 422) && Object.keys(error.fields ?? {}).length) {
          helpers.setErrors(error.fields);
          setStatus('idle');
        } else setStatus(error.status === 401 ? 'error-401' : 'error-network');
      } finally { clearTimeout(wakeTimer.current); pendingRequest.current = null; }
    },
  });
  const fieldError = (field: 'email' | 'password' | 'displayName') => form.touched[field] ? form.errors[field] : undefined;
  function fillDemo(role: 'OWNER' | 'ASSISTANT' | 'ADMIN') {
    const configuredEmail = import.meta.env[`VITE_DEMO_${role}_EMAIL`] as string | undefined;
    void form.setValues({ ...form.values, email: configuredEmail || `${role.toLowerCase()}@stockwise.demo`, password: import.meta.env.VITE_DEMO_PASSWORD || '' }, false);
    form.setErrors({});
    form.setTouched({});
    setStatus('idle');
    setDemoNotice(import.meta.env.VITE_DEMO_PASSWORD ? 'Demo details filled in. Select Sign in to continue.' : 'Enter the demonstration password provided by your team.');
    document.getElementById('auth-password')?.focus();
  }

  return <Dialog
    open title={isSignUp ? 'Create your account' : 'Sign in'}
    description={isSignUp ? 'Create a Stockwise account for your shop.' : 'Sign in to your Stockwise shop with email and password.'}
    descriptionClassName="sr-only" titleClassName="auth-title" closeClassName="auth-close"
    overlayClassName="auth-backdrop" className={`auth-dialog ${isSignUp ? 'registration-dialog' : ''}`}
    onOpenChange={(open) => { if (!open) void navigate('/'); }}
    onOpenAutoFocus={(event) => { event.preventDefault(); document.querySelector<HTMLElement>('[role="dialog"]')?.focus(); }}
    onCloseAutoFocus={(event) => { event.preventDefault(); document.querySelector<HTMLAnchorElement>(`.account-link[href="/${mode}"]`)?.focus(); }}
  >
    <form noValidate onSubmit={form.handleSubmit} className="auth-form" aria-busy={busy}>
      <fieldset disabled={busy} className="auth-fields">
        {isSignUp && <FormField label="Full name" id="auth-name" className="auth-field" error={fieldError('displayName')}>
          {(field) => <Input {...field} {...form.getFieldProps('displayName')} required autoComplete="name" className="auth-input" />}
        </FormField>}
        <FormField label="Email" id="auth-email" className="auth-field" error={fieldError('email')}>
          {(field) => <Input {...field} {...form.getFieldProps('email')} required type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} className="auth-input" aria-invalid={field['aria-invalid'] || status === 'error-401' || undefined} />}
        </FormField>
        <FormField label="Password" id="auth-password" className={`auth-field ${status === 'loading' ? 'loading-password' : ''}`} error={fieldError('password')}>
          {(field) => <div className="password-control"><Input {...field} {...form.getFieldProps('password')} required type={showPassword ? 'text' : 'password'} autoComplete={isSignUp ? 'new-password' : 'current-password'} className="auth-input" aria-invalid={field['aria-invalid'] || status === 'error-401' || undefined} />
            <Button variant="ghost" type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((show) => !show)}>{showPassword ? 'Hide' : 'Show'}</Button>
          </div>}
        </FormField>
      </fieldset>
      {status === 'waking' && <div className="waking-notice" role="status"><p>Service is waking up... this can take about a minute on the free plan.</p><div className="waking-progress" aria-hidden="true"><span /></div></div>}
      {(status === 'error-401' || status === 'error-network' || status === 'registration-pending') && <p className="status-banner" role="alert"><span className="error-icon" aria-hidden="true">!</span>{status === 'error-401' ? 'Wrong email or password' : status === 'error-network' ? "Can't reach the service. Try again." : registrationAvailability().message}</p>}
      <Button type="submit" className="auth-submit" size="lg" loading={busy} loadingLabel="Signing in...">{isSignUp ? 'Create account' : 'Sign in'}</Button>
      {!isSignUp && <section className="demo-section" aria-label="Demo accounts">
        <h3>Demo accounts</h3>
        <div className="demo-grid">{([
          ['OWNER', 'Owner', 'Everything'], ['ASSISTANT', 'Assistant', 'Sales and repayments'], ['ADMIN', 'Admin', 'Read-only plus reversals'],
        ] as const).map(([role, label, description]) => <div className="demo-account" key={role}><Button variant="secondary" className="demo-button" disabled={busy} onClick={() => fillDemo(role)}>{label}</Button><p>{description}</p></div>)}</div>
        {demoNotice && <p className="demo-notice" role="status">{demoNotice}</p>}
      </section>}
      <p className="auth-switch"><Link to={isSignUp ? '/sign-in' : '/sign-up'} replace>{isSignUp ? 'Have an account? Sign in' : 'New here? Sign up'}</Link></p>
    </form>
  </Dialog>;
}
