export const setAuthToken = (token) => {
  localStorage.setItem('access_token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

export const setUserRole = (role) => {
  localStorage.setItem('user_role', role);
};

export const getUserRole = () => {
  return localStorage.getItem('user_role');
};

export const setUsername = (username) => {
  localStorage.setItem('username', username);
};

export const getUsername = () => {
  return localStorage.getItem('username');
};

export const logout = async () => {
  try {
    const { auditAPI } = await import('./api');
    await auditAPI.logout();
  } catch (error) {
    console.error('Logout audit failed:', error);
  } finally {
    localStorage.clear();
    window.location.href = '/sign-in';
  }
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};
