import express from "express";
import MatchController from "../controllers/MatchController";


const router = express.Router()

router.post('/like', MatchController.like);
router.get('/ismatch/:userId', MatchController.checkMatch);

export default router;