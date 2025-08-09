import axios, { AxiosError } from 'axios';

const axiosInstance = axios.create({
  baseURL: '/',
});

const errorTransformer = (err: AxiosError) => {
  const status = err.response?.status;
  const statusText = err.response?.statusText;
  const message = (err.response?.data as { message: string }).message;
  const newErr = new Error(`(${status} ${statusText}) ${message}`);
  return Promise.reject(newErr);
};
axiosInstance.interceptors.response.use(null, errorTransformer);

axiosInstance.interceptors.response.use(
  null,
  async err => {
    const originalRequestUrl = err.config.url;
    if (err.response && err.response.status === 401 && originalRequestUrl !== '/auth/me') {
      try {
        await axios.post('/auth/logout');
      } catch (logoutError) {
        console.error('Server logout failed:', logoutError);
      } finally {
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
