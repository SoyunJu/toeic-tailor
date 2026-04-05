import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// 학생
export const getStudents      = (params)         => api.get('/students', { params });
export const getStudent       = (id)             => api.get(`/students/${id}`);
export const updateStudent    = (id, data)       => api.put(`/students/${id}`, data);
export const deleteStudent    = (id)             => api.delete(`/students/${id}`);
export const deleteScoreRecord = (studentId, scoreId) =>
    api.delete(`/students/${studentId}/scores/${scoreId}`);

// 업로드
export const uploadScores = (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload/scores', form);
};

// 문제 관리
export const getQuestions    = (params) => api.get('/questions', { params });
export const updateQuestion  = (id, data) => api.put(`/questions/${id}`, data);
export const deleteQuestion  = (id) => api.delete(`/questions/${id}`);

// 기출
export const generateWorkbook  = (studentId) => api.post('/workbooks/generate', { studentId });
export const getWorkbook       = (id)        => api.get(`/workbooks/${id}`);
export const regenerateWorkbook = (id)       => api.post(`/workbooks/${id}/regenerate`);

// 주문
export const createOrder = (data)              => api.post('/orders', data);
export const getOrders   = ()                  => api.get('/orders');
export const cancelOrder = (id, cancelReason)  => api.post(`/orders/${id}/cancel`, { cancelReason });

// 일괄 생성 — SSE / EventSource
export const generateBatch = (studentIds, onEvent) => {
    return new Promise((resolve, reject) => {
        fetch('/api/workbooks/generate-batch', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({studentIds}),
        }).then(async res => {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, {stream: true});
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event = JSON.parse(line.slice(6));
                            onEvent(event);
                            if (event.type === 'complete') resolve(event);
                        } catch {
                        }
                    }
                }
            }
        }).catch(reject);
    });
};

// PDF 다운로드
export const downloadWorkbookPdf = (id) =>
    api.get(`/workbooks/${id}/pdf`, { responseType: 'blob' });

export const deleteWorkbookBookUid = (workbookId) =>
    api.delete(`/workbooks/${workbookId}/book`);

export const downloadWorkbooksZip = (workbookIds) =>
    api.post('/workbooks/pdf-zip', { workbookIds }, { responseType: 'blob' });

// 충전금
export const getCredits  = ()           => api.get('/credits');
export const chargeCredits = (amount)   => api.post('/credits/charge', { amount });

// 설정
export const getSettings    = ()     => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);