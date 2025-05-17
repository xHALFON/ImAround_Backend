import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from "../models/userModel"
import { Request, Response } from 'express';
import * as dotenv from "dotenv";
import mongoose from 'mongoose';

dotenv.config()

class SearchController {
    search = async (req: Request, res: Response): Promise<void> => {
        console.log("\x1b[32m%s\x1b[0m", req.body.userIds+" Entered SearchController");
        try {
            const id = req.body.id
            const usersIds = req.body.userIds;
    
            if (!usersIds || !Array.isArray(usersIds)) {
                res.status(400).json({ message: 'Invalid users input' });
                return;
            }
    
            let users = await User.find({ _id: { $in: usersIds } });
            
            users = users.filter((user) => !id.dislike.includes(user._id.toString()));
    
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
        }
    };
}

export default new SearchController();