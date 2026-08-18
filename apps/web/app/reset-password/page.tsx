import { ResetPasswordForm } from "../../components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="container" style={{ paddingTop: 72, paddingBottom: 72, maxWidth: 820 }}>
      <h1 className="auth-title">Set a new password</h1>
      <p className="muted">
        Choose a new password for your account. Once saved, you&apos;ll be sent back to login.
      </p>
      <ResetPasswordForm />
    </main>
  );
}
