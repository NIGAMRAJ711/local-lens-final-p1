// Auto-detect API base URL
// In dev: Vite proxy handles /api → localhost:5001
// In production: Use VITE_API_URL or same origin
const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + '/api'
  : '/api';

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

export { SOCKET_URL };

class ApiClient {
  constructor() { this.base = API_BASE; }

  getHeaders(isFormData = false) {
    const token = localStorage.getItem('accessToken');
    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async request(method, path, body = null, isFormData = false) {
    const options = {
      method,
      headers: this.getHeaders(isFormData),
      credentials: 'include',
    };
    if (body) options.body = isFormData ? body : JSON.stringify(body);

    try {
      const res = await fetch(`${this.base}${path}`, options);

      if (res.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          options.headers = this.getHeaders(isFormData);
          const retryRes = await fetch(`${this.base}${path}`, options);
          if (!retryRes.ok) {
            const err = await retryRes.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(err.error || 'Request failed');
          }
          return retryRes.json();
        } else {
          localStorage.clear();
          window.location.href = '/login';
          return;
        }
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please check your connection.');
      }
      throw err;
    }
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${this.base}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return true;
    } catch { return false; }
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  delete(path) { return this.request('DELETE', path); }

  async uploadFile(path, file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('POST', path, formData, true);
  }
}

export const api = new ApiClient();

// Auth
export const authApi = {
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login', d),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// Users
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (d) => api.patch('/users/me', d),
  switchRole: (role) => api.patch('/users/me/role', { role }),
  updateGuideProfile: (d) => api.patch('/users/me/guide-profile', d),
  getWallet: () => api.get('/users/wallet'),
};

// Guides
export const guideApi = {
  search: (params) => api.get('/guides?' + new URLSearchParams(params).toString()),
  getById: (id) => api.get(`/guides/${id}`),
  register: (d) => api.post('/guides/register', d),
  updateAvailability: (isAvailable) => api.patch('/guides/availability', { isAvailable }),
  updateLocation: (lat, lng) => api.patch('/guides/location', { latitude: lat, longitude: lng }),
  addHiddenGem: (d) => api.post('/guides/hidden-gems', d),
  getDashboardStats: () => api.get('/guides/dashboard/stats'),
};

// Bookings
export const bookingApi = {
  create: (d) => api.post('/bookings', d),
  getMyBookings: (params) => api.get('/bookings/my?' + new URLSearchParams(params).toString()),
  updateStatus: (id, status) => api.patch(`/bookings/${id}/status`, { status }),
  complete: (id) => api.patch(`/bookings/${id}/complete`),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`),
  reject: (id, reason) => api.patch(`/bookings/${id}/reject`, { reason }),
};

export const availabilityApi = {
  getSlots: (guideId) => api.get(`/guides/${guideId}/availability`),
  addSlot: (data) => api.post('/guides/availability', data),
  deleteSlot: (id) => api.delete(`/guides/availability/${id}`),
};

export const bucketListApi = {
  get: () => api.get('/users/bucket-list'),
  add: (data) => api.post('/users/bucket-list', data),
  complete: (id) => api.patch(`/users/bucket-list/${id}/complete`),
  remove: (id) => api.delete(`/users/bucket-list/${id}`),
};

export const reviewsApi = {
  respond: (id, response) => api.patch(`/reviews/${id}/respond`, { response }),
};

// Reels
export const reelApi = {
  getFeed: (params) => api.get('/reels?' + new URLSearchParams(params).toString()),
  upload: (d) => api.post('/reels', d),
  like: (id) => api.post(`/reels/${id}/like`),
  view: (id) => api.post(`/reels/${id}/view`),
};

// Group Tours
export const groupTourApi = {
  list: (params) => api.get('/group-tours?' + new URLSearchParams(params).toString()),
  getById: (id) => api.get(`/group-tours/${id}`),
  create: (d) => api.post('/group-tours', d),
  join: (id) => api.post(`/group-tours/${id}/join`),
  myJoined: () => api.get('/group-tours/my/joined'),
};

// Map
export const mapApi = {
  getGuides: (params) => api.get('/map/guides?' + new URLSearchParams(params).toString()),
  getHiddenGems: (params) => api.get('/map/hidden-gems?' + new URLSearchParams(params).toString()),
};

// Reviews
export const reviewApi = {
  submit: (d) => api.post('/reviews', d),
};

// Chat
export const chatApi = {
  // Booking chat (preserved)
  getMessages: (bookingId) => api.get(`/chat/${bookingId}`),
  send: (bookingId, content, receiverId) => api.post(`/chat/${bookingId}`, { content, receiverId }),
  // Direct chat
  getInbox: () => api.get('/chat/inbox'),
  getContacts: () => api.get('/chat/contacts'),
  getConversation: (userId) => api.get(`/chat/dm/${userId}`),
  sendDirect: (userId, content) => api.post(`/chat/dm/${userId}`, { content }),
};

// Notifications
export const notificationApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
};

// Friends
export const friendsApi = {
  getFriends: () => api.get('/friends'),
  search: (q) => api.get(`/friends/search?q=${encodeURIComponent(q)}`),
  getProfile: (userId) => api.get(`/friends/profile/${userId}`),
  sendRequest: (userId) => api.post(`/friends/request/${userId}`),
  acceptRequest: (id) => api.patch(`/friends/request/${id}/accept`),
  declineRequest: (id) => api.patch(`/friends/request/${id}/decline`),
  getStatus: (userId) => api.get(`/friends/status/${userId}`),
  getFriendCount: (userId) => api.get(`/friends/count/${userId}`),
  getIncomingRequests: () => api.get('/friends/requests/incoming'),
  getSentRequests: () => api.get('/friends/requests/sent'),
};

// Upload
export const uploadApi = {
  image: (file) => api.uploadFile('/upload/image', file),
  video: (file) => api.uploadFile('/upload/video', file),
};

// Admin
export const adminApi = {
  blacklistUser: (userId, data) => api.post(`/admin/blacklist/${userId}`, data),
  getBlacklist: () => api.get('/admin/blacklist'),
  removeBlacklist: (userId) => api.delete(`/admin/blacklist/${userId}`),
};
