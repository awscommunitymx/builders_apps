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

export function generateAuthDomain(
  environmentName: string,
  hostedZoneName: string
): { authDomain: string; truncated: boolean } {
  const prefix = `auth-${environmentName}`;
  const hostedZoneNameLength = hostedZoneName.length;
  const maxLength = 63;

  if (prefix.length + hostedZoneNameLength + 1 <= maxLength) {
    return {
      authDomain: `${prefix}.${hostedZoneName}`,
      truncated: false,
    };
  }

  const truncatedEnvironmentName = environmentName.slice(
    0,
    maxLength - hostedZoneNameLength - 6 // 6 is length of "auth-" + "."
  );

  return {
    authDomain: `auth-${truncatedEnvironmentName}.${hostedZoneName}`,
    truncated: true,
  };
}
