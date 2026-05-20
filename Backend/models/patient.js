import express from 'express';

import {
  createPatient,
  getPatients,
  deletePatient
} from '../controllers/patientController.js';

const router = express.Router();

router.post('/', createPatient);
router.get('/', getPatients);
router.delete('/:id', deletePatient);

export default router;