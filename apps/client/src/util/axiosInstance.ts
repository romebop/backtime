import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/',
});

axiosInstance.interceptors.response.use(
  res => res,
  async (err) => {
    if (err.response && err.response.status === 401) {
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
