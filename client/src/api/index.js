import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// 학생
export const getStudents = (params) => api.get('/students', { params });
export const getStudent  = (id)     => api.get(`/students/${id}`);

// 업로드
export const uploadScores = (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload/scores', form);
};

// 문제집
export const generateWorkbook = (studentId) =>
    api.post('/workbooks/generate', { studentId });
export const getWorkbook = (id) => api.get(`/workbooks/${id}`);

// 주문
export const createOrder  = (data) => api.post('/orders', data);
export const getOrders    = ()     => api.get('/orders');
export const cancelOrder  = (id, cancelReason) =>
    api.post(`/orders/${id}/cancel`, { cancelReason });