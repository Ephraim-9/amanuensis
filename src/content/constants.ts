import { UserSettings } from '../shared/types';

export const CONTENT_DEFAULT_SETTINGS: UserSettings = {
  isTrackingEnabled: true,
  theme: 'serika-dark',
  burstIdleTimeoutMs: 1500,
  showBadgeWpm: true,
  ignoredDomains: ['bank', 'chase.com', 'wellsfargo.com', 'paypal.com', 'login.', 'accounts.'],
  trackDomainStats: true,
};
