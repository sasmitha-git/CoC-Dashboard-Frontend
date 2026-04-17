import axios from 'axios';

const GATEWAY = '/api/gateway';

const api = axios.create({
  baseURL: GATEWAY,
  timeout: 15000,
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
