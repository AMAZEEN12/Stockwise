import axios, { type AxiosError } from "axios";
import type { ProblemDetails } from "../models/responses/auth";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4710",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 10000,
});

httpClient.interceptors.request.use((config) => {
  const requestId = crypto.randomUUID();
  config.headers.set("X-Request-Id", requestId);
  const token = sessionStorage.getItem("stockwise.accessToken");
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

export function normalizeApiError(error: unknown): ProblemDetails {
  if (!axios.isAxiosError(error)) return { detail: "Something went wrong. Try again." };
  const axiosError = error as AxiosError<ProblemDetails>;
  if (!axiosError.response) return { detail: "The service is unavailable. Try again." };
  return axiosError.response.data ?? { status: axiosError.response.status, detail: "Request failed." };
}
