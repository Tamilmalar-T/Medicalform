import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import patientRoutes from './models/patient.js';

dotenv.config();

const app = express();

connectDB();

app.use(cors());

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/patients', patientRoutes);

app.get('/', (req, res) => {
  res.send('MedFlow Backend Running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});