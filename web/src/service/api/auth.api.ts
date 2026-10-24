import { authEndpoints } from "../endpoints/auth";
import { httpClient } from "../http-client";
import type { LoginRequest } from "../../models/requests/auth";
import type { Session, User } from "../../models/responses/auth";

export async function createSession(request: LoginRequest): Promise<Session> {
  const { data } = await httpClient.post<Session>(authEndpoints.sessions, request);
  sessionStorage.setItem("stockwise.accessToken", data.accessToken);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await httpClient.get<User>(authEndpoints.me);
  return data;
}
