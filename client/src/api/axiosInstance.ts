import axios from 'axios';

let API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

// Auto-fix: Ensure the URL ends with /api/v1 for production compatibility
if (API_BASE && !API_BASE.endsWith('/api/v1') && !API_BASE.endsWith('/api/v1/')) {
    API_BASE = API_BASE.endsWith('/') ? `${API_BASE}api/v1` : `${API_BASE}/api/v1`;
}

const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Global error handling
    const message = error.response?.data?.message || 'Something went wrong';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

export default axiosInstance;
