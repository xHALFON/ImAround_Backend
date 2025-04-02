import express from "express";
import AuthController from "../controllers/AuthController"


const router = express.Router()

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/fetchProfile/:userId', AuthController.fetchProfile);

export default router;