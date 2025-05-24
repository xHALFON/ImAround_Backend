import express from "express";
import MatchController from "../controllers/MatchController";


const router = express.Router()

router.post('/like', MatchController.like);
router.post('/dislike', MatchController.dislike);
router.post('/save-fcm-token', MatchController.saveFCMToken);

export default router;