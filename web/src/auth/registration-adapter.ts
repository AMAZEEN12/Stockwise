/** Registration is proposed in docs/auth-contract-proposal.md; no network call until approved. */
export function registrationAvailability(): {
  available: false;
  message: string;
} {
  return {
    available: false,
    message:
      "Account creation is not available yet. Please use a demo account to sign in.",
  };
}
