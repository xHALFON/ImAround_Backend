import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from "../models/userModel"
import { Request, Response } from 'express';
import * as dotenv from "dotenv";
import mongoose from 'mongoose';

dotenv.config()

class SearchController {
    search = async (ids: string[]): Promise<any> => {
        console.log("\x1b[32m%s\x1b[0m", ids+" Entered SearchController");
        try {
            const usersIds = ids;
    
            if (!usersIds || !Array.isArray(usersIds)) {
                return { message: 'Invalid users input' };
            }
    
            const users = await User.find({ _id: { $in: usersIds } });
    
            return users
        } catch (error) {
          return { message: 'Server error', error };
        }
    };
}

export default new SearchController();