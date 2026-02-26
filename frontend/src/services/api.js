import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
};

// Users
export const usersAPI = {
  getAll: () => API.get('/users'),
  getById: (id) => API.get(`/users/${id}`),
  updateProfile: (data) => API.put('/users/profile', data),
};

// Messages
export const messagesAPI = {
  getDirect: (userId) => API.get(`/messages/direct/${userId}`),
  getRoom: (roomId) => API.get(`/messages/room/${roomId}`),
  delete: (id) => API.delete(`/messages/${id}`),
};

// Rooms
export const roomsAPI = {
  getAll: () => API.get('/rooms'),
  create: (data) => API.post('/rooms', data),
  join: (id) => API.post(`/rooms/${id}/join`),
  leave: (id) => API.post(`/rooms/${id}/leave`),
};

// Admin
export const adminAPI = {
  getStats: () => API.get('/admin/stats'),
  getUsers: () => API.get('/admin/users'),
  updateUserRole: (id, role) => API.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  getRooms: () => API.get('/admin/rooms'),
  deleteRoom: (id) => API.delete(`/admin/rooms/${id}`),
  getMessages: () => API.get('/admin/messages'),
};

export default API;