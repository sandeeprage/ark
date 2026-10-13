export function eventTime(value: string, now = Date.now()) {
  const date = new Date(value);
  const difference = now - date.getTime();
  if (difference >= 0 && difference < 60_000) return "Just now";
  if (difference >= 60_000 && difference < 3_600_000)
    return `${Math.floor(difference / 60_000)} min ago`;
  if (difference >= 3_600_000 && difference < 86_400_000)
    return `${Math.floor(difference / 3_600_000)} hr ago`;
  return `${date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST`;
}
