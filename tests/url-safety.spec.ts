import { expect, test } from "@playwright/test";

import { assertPublicUrl, isBlockedIp, normalizeUrlInput } from "@/lib/audit/url-safety";

test("normalizes a company hostname to HTTPS", () => {
  expect(normalizeUrlInput("example.com/about").href).toBe("https://example.com/about");
});

test("rejects unsafe protocols and local targets", async () => {
  expect(() => normalizeUrlInput("file:///etc/passwd")).toThrow(/HTTP and HTTPS/);
  await expect(assertPublicUrl("http://127.0.0.1:3000")).rejects.toThrow(/private|reserved/i);
  await expect(assertPublicUrl("http://localhost:3000")).rejects.toThrow(/private/i);
});

test("classifies private and public IP addresses", () => {
  expect(isBlockedIp("10.0.0.1")).toBe(true);
  expect(isBlockedIp("169.254.169.254")).toBe(true);
  expect(isBlockedIp("8.8.8.8")).toBe(false);
  expect(isBlockedIp("::1")).toBe(true);
  expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
});
