import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    ".next-publishing-tests/**",
    ".next-production-checks/**",
    ".next-navigation-build/**",
    "next-env.d.ts",
    ".local-postgres/**",
    ".local-postgres-check/**",
    "test-results/**",
    "playwright-report/**",
    "coverage/**",
    ".vercel/**",
  ]),
]);
