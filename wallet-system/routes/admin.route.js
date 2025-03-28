import express from 'express';
import { getPendingPayouts, handlePayout } from '../controllers/admin.controller.js';
import { loginUser } from '../controllers/user.controller.js';

const router = express.Router();

router.get('/login', loginUser);

// get all pending payouts
router.get('/payouts', getPendingPayouts);

// handle the payout request
router.post('/payout', handlePayout);

export default router