import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from "../models/userModel"
import { Request, Response } from 'express';
import * as dotenv from "dotenv";
import mongoose from 'mongoose';
import crypto from 'crypto';

dotenv.config()

const generateUniqueCustomId = async (): Promise<string> => {
    let customId;
    let existingUser;
    
    do {
        customId = crypto.randomBytes(4).toString('hex');
        existingUser = await User.findById(customId);
    } while (existingUser);
    
    return customId;
};

const generateToken = (id: string): string => {
    return jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: '1h' });
};

class AuthController {
    register = async (req: Request, res: Response): Promise<void> => {
        try{
            const { username, email, password} = req.body;

            if (!password) {
                res.status(400).json({ message: 'Password must provided' });
                return;
            }
            const userExists_email = await User.findOne({ email });
            if (userExists_email) {
                res.status(400).json({ message: 'Email already exists' });
                return;
            }

            // Generate custom ID
            const customId = await generateUniqueCustomId();
            
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({ 
                _id: customId, // Set custom ID
                username, 
                email, 
                password: hashedPassword
            });
            await user.save();

            res.status(201).json({
                id: user._id, // This will now be the 8-character ID
                username: user.username,
                email: user.email,
                token: generateToken(user._id.toString()),
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email });
            if (!user) {
                res.status(401).json({ message: "Invalid email or password" });
                return;
            }
            const matchPassword = await bcrypt.compare(password, user.password);
            if (!matchPassword) {
                res.status(401).json({ message: "Invalid email or password" });
                return;
            }

            const refreshToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "7d" });

            user.refreshToken = refreshToken;
            await user.save();
            res.json({
                id: user._id, // This will be the 8-character ID
                username: user.username,
                email: user.email,
                accessToken: generateToken(user._id.toString()),
                refreshToken: refreshToken,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default new AuthController();