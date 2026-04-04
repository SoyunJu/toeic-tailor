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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});