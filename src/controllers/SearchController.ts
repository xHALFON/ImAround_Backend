import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from "../models/userModel"
import { Request, Response } from 'express';
import * as dotenv from "dotenv";
import mongoose from 'mongoose';

dotenv.config()

class SearchController {
    search = async (req: Request, res: Response): Promise<void> => {
        try {
            const usersIds = req.body.userIds;
    
            if (!usersIds || !Array.isArray(usersIds)) {
                res.status(400).json({ message: 'Invalid users input' });
                return;
            }
    
            const users = await User.find({ _id: { $in: usersIds } });
    
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
        }
    };
}

export default new SearchController();