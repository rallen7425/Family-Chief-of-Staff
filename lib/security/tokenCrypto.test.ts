import { describe, expect, it, beforeAll } from "vitest";
import { encryptToken, decryptToken } from "@/lib/security/tokenCrypto";

beforeAll(() => {
  // Deterministic 32-byte test key — never the real one.
  process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("tokenCrypto", () => {
  it("round-trips a plaintext token", () => {
    const plaintext = "1//0abcdEXAMPLE-refresh-token";
    const encrypted = encryptToken(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const a = encryptToken("same-value");
    const b = encryptToken("same-value");
    expect(a.equals(b)).toBe(false);
    expect(decryptToken(a)).toBe("same-value");
    expect(decryptToken(b)).toBe("same-value");
  });

  it("throws on tampered ciphertext instead of returning garbage", () => {
    const encrypted = encryptToken("secret-value");
    encrypted[encrypted.length - 1] ^= 0xff; // flip a bit in the ciphertext
    expect(() => decryptToken(encrypted)).toThrow();
  });

  it("throws a clear error when the encryption key is missing", () => {
    const saved = process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY;
    delete process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("x")).toThrow(/CONNECTOR_TOKEN_ENCRYPTION_KEY/);
    process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY = saved;
  });
});
