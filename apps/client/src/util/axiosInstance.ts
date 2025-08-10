import axios, { AxiosError } from 'axios';

const axiosInstance = axios.create({
  baseURL: '/',
});

axiosInstance.interceptors.response.use(
  null,
  async (err: AxiosError) => {

    const status = err.response?.status;
    const statusText = err.response?.statusText;
    const message = (err.response?.data as { message: string }).message;
    const apiErr = new Error(`(${status} ${statusText}) ${message}`);
    console.error(apiErr);
    
    const originalRequestUrl = err.config?.url;
    if (err.response?.status === 401 && originalRequestUrl !== '/auth/me') {
      try {
        await axios.post('/auth/logout');
      } catch (err) {
        void err;
      } finally {
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
