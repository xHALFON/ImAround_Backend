import express from "express";
import MatchController from "../controllers/MatchController";


const router = express.Router()

router.post('/like', MatchController.like);

export default router;