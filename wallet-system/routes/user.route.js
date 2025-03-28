import express from 'express';
import { createUser, deposit, getWallet, loginUser, requestPayout } from '../controllers/user.controller.js';

const router = express.Router();

// create user wallet
router.post('/register', createUser);
router.post('/login', loginUser);

// get wallet details
router.get('/wallet/:userId', getWallet);

// deposit amount to wallet
router.post('/deposit', deposit);

// user request for payouts
router.post('/payout', requestPayout);

export default router