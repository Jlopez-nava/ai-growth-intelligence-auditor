import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const MAX_URL_LENGTH = 2_048;

function isBlockedIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) return true;

  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isBlockedIpv6(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:")) {
    return isBlockedIpv4(normalized.slice("::ffff:".length));
  }

  // Public global-unicast IPv6 addresses live in 2000::/3. This MVP is
  // intentionally conservative and separately blocks the documentation range.
  return (
    !/^[23]/.test(normalized) ||
    normalized.startsWith("2001:db8:") ||
    normalized === "2001:db8::"
  );
}

export function isBlockedIp(address: string) {
  const version = isIP(address);
  if (version === 4) return isBlockedIpv4(address);
  if (version === 6) return isBlockedIpv6(address);
  return true;
}

export function normalizeUrlInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new UnsafeUrlError("Enter a company URL.");
  if (trimmed.length > MAX_URL_LENGTH) throw new UnsafeUrlError("The URL is too long.");

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new UnsafeUrlError("Enter a valid company URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only HTTP and HTTPS URLs are supported.");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs containing credentials are not supported.");
  }
  if (!url.hostname || url.hostname.toLowerCase() === "localhost") {
    throw new UnsafeUrlError("Local and private network URLs are not allowed.");
  }

  url.hash = "";
  return url;
}

export async function assertPublicUrl(input: string | URL) {
  const url = input instanceof URL ? input : normalizeUrlInput(input);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new UnsafeUrlError("Local, private, and reserved network addresses are not allowed.");
    }
    return url;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError(`Could not resolve ${hostname}.`);
  }

  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedIp(address))) {
    throw new UnsafeUrlError("The URL resolves to a local, private, or reserved network address.");
  }

  return url;
}
