import express from "express";
import SearchController from "../controllers/SearchController"

const router = express.Router()

router.post('/findUsers', SearchController.search);

export default router;