import { describe, it, expect } from 'vitest';
import { PrivacyGuard } from '../src/content/privacy_guard';

describe('PrivacyGuard', () => {
  const guard = new PrivacyGuard(['custom-secret.internal']);

  it('detects sensitive banking and auth domains', () => {
    expect(guard.isHostIgnored('paypal.com')).toBe(true);
    expect(guard.isHostIgnored('accounts.google.com')).toBe(true);
    expect(guard.isHostIgnored('chase.com')).toBe(true);
    expect(guard.isHostIgnored('custom-secret.internal')).toBe(true);
    expect(guard.isHostIgnored('github.com')).toBe(false);
    expect(guard.isHostIgnored('monkeytype.com')).toBe(false);
    expect(guard.isHostIgnored('wikipedia.org')).toBe(false);
  });

  it('correctly handles undefined or null elements', () => {
    expect(guard.isElementSensitive(null)).toBe(false);
  });
});
