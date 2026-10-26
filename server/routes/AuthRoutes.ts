import express from 'express'
import { loginUser, LogoutUser, RegisterUser, verifyUser } from '../controllers/AuthControllers.js';
import protect from '../middlewares/auth.js';

const AuthRouter = express.Router();

AuthRouter.post('/register', RegisterUser)
AuthRouter.post('/login', loginUser)
AuthRouter.get('/verify', protect, verifyUser)
AuthRouter.post('/logout', protect,LogoutUser)

export default AuthRouter