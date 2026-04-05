require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/students',  require('./routes/students'));
app.use('/api/upload',    require('./routes/upload'));
app.use('/api/workbooks', require('./routes/workbooks'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/credits',   require('./routes/credits'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

async function loadSettingsFromDB() {
    try {
        const { prisma } = require('./lib/prisma');
        const settings = await prisma.setting.findMany();
        for (const s of settings) {
            if (!process.env[s.key]) {
                process.env[s.key] = s.value;
            }
        }
        console.log('[STARTUP] DB 설정 로드 완료');
    } catch (e) {
        console.log('[STARTUP] DB 설정 로드 실패 (초기화 전일 수 있음):', e.message);
    }
}

loadSettingsFromDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
