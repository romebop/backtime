import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

let accessToken: string | null = null;
let failedQueue: { resolve: (value: unknown) => void, reject: (reason?: any) => void }[] = [];
let isRefreshing = false;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

export const getAccessToken = () => accessToken;

const axiosInstance = axios.create({
  baseURL: '/',
});

// auth header interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  err => Promise.reject(err),
);

// logging interceptor
axiosInstance.interceptors.response.use(
  null,
  (err: AxiosError) => {
    const status = err.response?.status;
    const statusText = err.response?.statusText;
    const message = (err.response?.data as { message: string }).message;
    const apiErr = new Error(`(${status} ${statusText}) ${message}`);
    console.error(apiErr);
    return Promise.reject(err);
  }
);

// auth token refresh interceptor
axiosInstance.interceptors.response.use(
  null,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest.url === '/auth/refresh') {
      return Promise.reject(error);
    }

    // prevent infinite loops
    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const { data } = await axios.post('/auth/refresh');
        setAccessToken(data.accessToken);

        failedQueue.forEach(({ resolve }) => resolve(axiosInstance(originalRequest)));
        failedQueue = [];

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        
        setAccessToken(null);
        
        failedQueue.forEach(({ reject }) => reject(refreshError));
        failedQueue = [];

        window.location.href = '/'; 
        
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    } else {
      // if token is already being refreshed, queue the original request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
    }
  }
);

export default axiosInstance;
