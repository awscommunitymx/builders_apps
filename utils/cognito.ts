export function sanitizeDomainPrefix(environmentName: string): string {
  const sanitized = environmentName.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const domainPrefix = `profiles-${sanitized}`;
  return domainPrefix.includes('cognito')
    ? domainPrefix.replace('cognito', 'profiles')
    : domainPrefix;
}

export function getAuthUrls(
  environmentName: string,
  appDomain: string | undefined,
  path: string
): string[] {
  if (!appDomain) {
    return [`http://localhost:5173/auth/${path}`];
  }

  if (environmentName === 'production') {
    return [`https://${appDomain}/auth/${path}`];
  }

  return [`https://${appDomain}/auth/${path}`, `http://localhost:5173/auth/${path}`];
}
