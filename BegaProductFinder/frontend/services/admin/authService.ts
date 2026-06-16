const AUTH_KEY = 'bega_admin_auth';
const MOCK_CREDENTIALS = { username: 'admin', password: 'bega@2024' };

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

export async function login(username: string, password: string): Promise<void> {
  await new Promise(r => setTimeout(r, 700));
  if (
    username.trim().toLowerCase() === MOCK_CREDENTIALS.username &&
    password === MOCK_CREDENTIALS.password
  ) {
    sessionStorage.setItem(AUTH_KEY, '1');
    return;
  }
  throw new Error('Invalid username or password.');
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_KEY);
}
