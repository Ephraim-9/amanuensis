/**
 * Privacy Guard: Enforces zero-trust local privacy protection.
 * Ensures no sensitive fields (passwords, credit cards, banking) are ever tracked,
 * and no raw text/sentences are ever stored.
 */

const SENSITIVE_INPUT_TYPES = new Set([
  'password',
  'hidden',
]);

const SENSITIVE_AUTOCOMPLETE = [
  'current-password',
  'new-password',
  'cc-number',
  'cc-exp',
  'cc-csc',
  'cc-type',
  'one-time-code',
  'cvc',
  'credit-card',
];

const SENSITIVE_NAME_PATTERNS = [
  /password/i,
  /passwd/i,
  /pwd/i,
  /cvv/i,
  /cvc/i,
  /ssn/i,
  /credit[-_]?card/i,
  /card[-_]?num/i,
  /secret[-_]?key/i,
  /api[-_]?key/i,
  /access[-_]?token/i,
  /auth[-_]?token/i,
];

const DEFAULT_SENSITIVE_HOSTNAMES = [
  'paypal.com',
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'citi.com',
  'capitalone.com',
  'login.microsoftonline.com',
  'accounts.google.com',
  'auth0.com',
  'stripe.com',
];

export class PrivacyGuard {
  private ignoredDomains: string[] = [];

  constructor(ignoredDomains: string[] = []) {
    this.setIgnoredDomains(ignoredDomains);
  }

  public setIgnoredDomains(domains: string[]): void {
    this.ignoredDomains = [...DEFAULT_SENSITIVE_HOSTNAMES, ...domains].map((d) => d.toLowerCase());
  }

  /**
   * Checks if the current page hostname or URL is classified as sensitive or user-ignored.
   */
  public isHostIgnored(hostname: string = window?.location?.hostname || ''): boolean {
    const host = hostname.toLowerCase();
    return this.ignoredDomains.some((domain) => host.includes(domain));
  }

  /**
   * Checks if a target DOM element is an input where typing must NEVER be monitored.
   */
  public isElementSensitive(element: EventTarget | null): boolean {
    if (!element || !(element instanceof HTMLElement)) {
      return false;
    }

    // 1. Check if input is a password or hidden field
    if (element instanceof HTMLInputElement) {
      if (SENSITIVE_INPUT_TYPES.has(element.type.toLowerCase())) {
        return true;
      }

      // Check autocomplete attributes
      const autocomplete = (element.autocomplete || '').toLowerCase();
      if (SENSITIVE_AUTOCOMPLETE.some((pattern) => autocomplete.includes(pattern))) {
        return true;
      }
    }

    // 2. Check element attributes (id, name, data-*, aria-label)
    const nameAttr = (element.getAttribute('name') || '').toLowerCase();
    const idAttr = (element.id || '').toLowerCase();
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();

    for (const pattern of SENSITIVE_NAME_PATTERNS) {
      if (pattern.test(nameAttr) || pattern.test(idAttr) || pattern.test(ariaLabel)) {
        return true;
      }
    }

    // 3. Check for explicitly marked private or sensitive data attributes
    if (
      element.hasAttribute('data-private') ||
      element.hasAttribute('data-sensitive') ||
      element.getAttribute('aria-hidden') === 'true'
    ) {
      return true;
    }

    // 4. Check parent form or container if it is explicitly an authentication/payment form
    const parentForm = element.closest('form');
    if (parentForm) {
      const formAction = (parentForm.getAttribute('action') || '').toLowerCase();
      const formId = (parentForm.id || '').toLowerCase();
      const formName = (parentForm.getAttribute('name') || '').toLowerCase();

      if (
        formAction.includes('login') ||
        formAction.includes('signin') ||
        formAction.includes('checkout') ||
        formAction.includes('payment') ||
        formId.includes('login') ||
        formId.includes('auth') ||
        formName.includes('login') ||
        formName.includes('auth')
      ) {
        // If the form has password inputs, be cautious and avoid monitoring anything in this form
        if (parentForm.querySelector('input[type="password"]')) {
          return true;
        }
      }
    }

    return false;
  }
}
