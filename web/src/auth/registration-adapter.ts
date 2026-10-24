import type { RegistrationRequest } from "../models/requests/auth";

export async function submitRegistration(_request: RegistrationRequest): Promise<never> {
  await new Promise((resolve) => window.setTimeout(resolve, 500));
  throw new Error("Registration is not available until the API contract is approved.");
}
