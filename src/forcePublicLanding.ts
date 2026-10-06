const PUBLIC_LANDING_STATE_KEY = 'arboris_ui_state_v1';
const FORCE_PUBLIC_LANDING_MARKER_KEY = 'arboris_force_public_landing_v1';

const truthyValues = new Set(['', '1', 'true', 'yes', 'on', 'public', 'landing', 'home']);
const forceKeys = ['landing', 'public', 'home'];

const paramForcesPublicLanding = (params: URLSearchParams) =>
  forceKeys.some((key) => {
    if (!params.has(key)) return false;
    return truthyValues.has((params.get(key) || '').trim().toLowerCase());
  });

const urlForcesPublicLanding = () => {
  if (typeof window === 'undefined') return false;

  const searchParams = new URLSearchParams(window.location.search);
  if (paramForcesPublicLanding(searchParams)) return true;

  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return false;

  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash;
  try {
    return paramForcesPublicLanding(new URLSearchParams(hashQuery));
  } catch {
    return false;
  }
};

const forcePublicLanding = () => {
  if (typeof window === 'undefined') return;
  if (!urlForcesPublicLanding()) return;

  try {
    window.localStorage.removeItem(PUBLIC_LANDING_STATE_KEY);
    window.sessionStorage.setItem(FORCE_PUBLIC_LANDING_MARKER_KEY, '1');
  } catch {
    // Some Telegram/WebView contexts can restrict storage. In that case, fail silently.
  }
};

forcePublicLanding();
