import { createAuthClient } from "better-auth/react";
import { dashClient } from "@better-auth/infra/client";

const BACKEND_URL = window.location.hostname === 'localhost'
  ? "http://localhost:5000"
  : window.location.hostname.includes('loca.lt')
    ? "https://honest-trains-hear.loca.lt"
    : window.location.origin;

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [
    dashClient()
  ]
});
