import api from './axios';

const inFlightGetRequests = new Map();

const dedupedGet = (key, request) => {
  const existing = inFlightGetRequests.get(key);
  if (existing) return existing;
  const pending = request().finally(() => {
    if (inFlightGetRequests.get(key) === pending) inFlightGetRequests.delete(key);
  });
  inFlightGetRequests.set(key, pending);
  return pending;
};

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const youtubeAPI = {
  search: (q, limit = 10, signal) => api.get('/music/search', { params: { q, limit }, signal }),
  trending: (limit = 20) => dedupedGet(`trending:${limit}`, () => api.get('/youtube/trending', { params: { limit } })),
  videoDetails: (id) => api.get(`/youtube/video/${id}`),
  lyrics: (title, artist, signal) => api.get('/youtube/lyrics', { params: { title, artist }, signal }),
  artistSearch: (name, limit = 10) => api.get('/youtube/artist', { params: { name, limit } }),
  recommendations: () => dedupedGet('recommendations', () => api.get('/youtube/recommendations')),
};

export const userAPI = {
  getLikedSongs: () => api.get('/user/liked'),
  likeSong: (videoId, data) => api.post(`/user/liked/${videoId}`, data),
  unlikeSong: (videoId) => api.delete(`/user/liked/${videoId}`),
  getLikeStatus: (videoId) => api.get(`/user/liked/${videoId}/status`),
};

export const playlistAPI = {
  getAll: () => api.get('/playlists'),
  getOne: (id) => api.get(`/playlists/${id}`),
  create: (data) => api.post('/playlists', data),
  update: (id, data) => api.put(`/playlists/${id}`, data),
  delete: (id) => api.delete(`/playlists/${id}`),
  addSong: (id, data) => api.post(`/playlists/${id}/songs`, data),
  removeSong: (id, videoId) => api.delete(`/playlists/${id}/songs/${videoId}`),
  reorderSongs: (id, songIds) => api.put(`/playlists/${id}/songs/reorder`, { songIds }),
};

export const historyAPI = {
  log: (data) => api.post('/history', data),
  get: (limit = 50) => api.get('/history', { params: { limit } }),
  clear: () => api.delete('/history'),
};

export const musicAPI = {
  getDownloadable: (params = {}) => api.get('/music/downloadable', { params }),
  searchDownloadable: (q, limit = 20) => api.get('/music/downloadable/search', { params: { q, limit } }),
};

