const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.base = API_BASE;
  }

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
    if (body) {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
      const res = await fetch(`${this.base}${path}`, options);
      
      // Handle token expiry
      if (res.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          options.headers = this.getHeaders(isFormData);
          const retryRes = await fetch(`${this.base}${path}`, options);
          if (!retryRes.ok) {
            const err = await retryRes.json();
            throw new Error(err.error || 'Request failed');
          }
          return retryRes.json();
        } else {
          localStorage.clear();
          window.location.href = '/login';
          return;
        }
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
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
    } catch {
      return false;
    }
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
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// Users
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.patch('/users/me', data),
  switchRole: (role) => api.patch('/users/me/role', { role }),
  updateGuideProfile: (data) => api.patch('/users/me/guide-profile', data),
  getWallet: () => api.get('/users/wallet'),
};

// Guides
export const guideApi = {
  search: (params) => api.get('/guides?' + new URLSearchParams(params).toString()),
  getById: (id) => api.get(`/guides/${id}`),
  register: (data) => api.post('/guides/register', data),
  updateAvailability: (isAvailable) => api.patch('/guides/availability', { isAvailable }),
  updateLocation: (lat, lng) => api.patch('/guides/location', { latitude: lat, longitude: lng }),
  addHiddenGem: (data) => api.post('/guides/hidden-gems', data),
  getDashboardStats: () => api.get('/guides/dashboard/stats'),
};

// Bookings
export const bookingApi = {
  create: (data) => api.post('/bookings', data),
  getMyBookings: (params) => api.get('/bookings/my?' + new URLSearchParams(params).toString()),
  updateStatus: (id, status) => api.patch(`/bookings/${id}/status`, { status }),
  complete: (id) => api.patch(`/bookings/${id}/complete`),
};

// Reels
export const reelApi = {
  getFeed: (params) => api.get('/reels?' + new URLSearchParams(params).toString()),
  upload: (data) => api.post('/reels', data),
  like: (id) => api.post(`/reels/${id}/like`),
  view: (id) => api.post(`/reels/${id}/view`),
};

// Group Tours
export const groupTourApi = {
  list: (params) => api.get('/group-tours?' + new URLSearchParams(params).toString()),
  getById: (id) => api.get(`/group-tours/${id}`),
  create: (data) => api.post('/group-tours', data),
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
  submit: (data) => api.post('/reviews', data),
};

// Chat
export const chatApi = {
  getMessages: (bookingId) => api.get(`/chat/${bookingId}`),
};

// Notifications
export const notificationApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
};

// Friends
export const friendsApi = {
  getFriends: () => api.get('/friends'),
  search: (q) => api.get(`/friends/search?q=${encodeURIComponent(q)}`),
  getProfile: (userId) => api.get(`/friends/profile/${userId}`),
};

// Upload
export const uploadApi = {
  image: (file) => api.uploadFile('/upload/image', file),
  video: (file) => api.uploadFile('/upload/video', file),
};
