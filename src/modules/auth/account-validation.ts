export function recentlyAuthenticated(lastSignIn: string | undefined, now = Date.now()) {
  if (!lastSignIn) return false;
  const time = Date.parse(lastSignIn);
  return Number.isFinite(time) && time <= now + 60_000 && now - time < 10 * 60_000;
}
export function usableIdentities(identities: { provider: string }[] = []) {
  return identities.filter(
    (identity) => identity.provider === "github" || identity.provider === "google",
  );
}
