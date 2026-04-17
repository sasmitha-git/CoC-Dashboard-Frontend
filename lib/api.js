import axios from 'axios';
import Cookies from 'js-cookie';

const GATEWAY = 'env.NEXT_PUBLIC_GATEWAY_URL';

const api = axios.create({
  baseURL: GATEWAY,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const apimToken = process.env.NEXT_PUBLIC_APIM_TOKEN;
  if (apimToken) {
    config.headers['Authorization'] = `Bearer ${apimToken}`;
  }
  return config;
});


const encodeTag = (tag) => encodeURIComponent(tag);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const playerApi = {
  getPlayer: (tag) => api.get(`/players/${encodeTag(tag)}`),
};

export const clanApi = {
  getClan: (tag) => api.get(`/clans/${encodeTag(tag)}`),

  getLeaderboard: (tag, sortBy = 'trophies') =>
    api.get(`/clans/${encodeTag(tag)}/leaderboard?sortBy=${sortBy}`),
};

export const warApi = {
  getCurrentWar: (tag) => api.get(`/wars/${encodeTag(tag)}/current`),
  getWarSummary: (tag) => api.get(`/wars/${encodeTag(tag)}/summary`),
};

export default api;
