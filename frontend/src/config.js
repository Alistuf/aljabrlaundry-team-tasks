const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

export const API_BASE_URL = backendUrl.replace(/\/$/, '');
export const API_URL = `${API_BASE_URL}/api`;

export const apiAssetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
};
