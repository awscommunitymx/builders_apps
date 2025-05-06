interface LoggedInUser {
  username: string;
  groups: string[];
  sub: string;
}

export const getLoggedInUser = (): LoggedInUser | null => {
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) {
    return null;
  }
  const payload = accessToken.split('.')[1];
  const decodedPayload = JSON.parse(atob(payload));
  return {
    username: decodedPayload['cognito:username'],
    groups: decodedPayload['cognito:groups'] || [],
    sub: decodedPayload['sub'],
  };
};
