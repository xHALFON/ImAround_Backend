import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from "../models/userModel"
import { Request, Response } from 'express';
import * as dotenv from "dotenv";
import mongoose from 'mongoose';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
        console.log("Entered RegisterController");
        console.log("Request Register body: ", req.body);
        try {
            const { firstName, lastName, avatar, birthDate, email, password, about, occupation, hobbies } = req.body;

            if (!password) {
                res.status(400).json({ message: 'Password must be provided' });
                return;
            }

            const userExists_email = await User.findOne({ email });
            if (userExists_email) {
                res.status(400).json({ message: 'Email already exists' });
                return;
            }

            const customId = await generateUniqueCustomId();
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = new User({
                _id: customId,
                avatar,
                firstName,
                lastName,
                email,
                password: hashedPassword,
                birthDate: new Date(birthDate.split("/").reverse().join("-")),
                about: about || "",
                occupation: occupation || "",
                hobbies: hobbies || [],
            });

            await user.save();

            res.status(201).json({
                id: user._id,
                avatar: user.avatar,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                birthDate: user.birthDate,
                about: user.about,
                occupation: user.occupation,
                hobbies: user.hobbies,
                token: generateToken(user._id.toString()),
            });
        } catch (error) {
            console.log(error.message);
            res.status(500).json({ message: error.message });
        }
    }

    login = async (req: Request, res: Response): Promise<void> => {
        console.log("Entered LoginController");
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
                id: user._id,
                avatar: user.avatar,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                birthDate: user.birthDate,
                accessToken: generateToken(user._id.toString()),
                refreshToken: refreshToken,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    fetchProfile = async (req: Request, res: Response): Promise<void> => {
        console.log("Entered FetchProfileController");
        try {
            const { userId } = req.params;
            const user = await User.findOne({ _id: userId });

            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            console.log("User found: ", user);
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    }

    updateAbout = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId, aboutContent } = req.body;

            const updatedUser = await User.findOneAndUpdate(
                { _id: userId },
                { about: aboutContent },
                { new: true }
            );

            if (!updatedUser) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            res.json({
                id: updatedUser._id,
                avatar: updatedUser.avatar,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                birthDate: updatedUser.birthDate,
                about: updatedUser.about,
            });
        } catch (error) {
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    };


    updateProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const updatedFields = req.body;
    
            console.log("🛠️ Received update for user:", id);
            console.log("🧠 Fields:", updatedFields);
    
            const updatedUser = await User.findByIdAndUpdate(
                id,
                { $set: updatedFields }, // <- FORCE the set including hobbies
                { new: true }
            );
    
            if (!updatedUser) {
                res.status(404).json({ message: "User not found" });
                return;
            }
    
            res.status(200).json(updatedUser);
        } catch (error) {
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    };

    getUserById = async (req: Request, res: Response): Promise<void> => {
        console.log("Entered getUserByIdController");
        try {
            const { userId } = req.params;
            
            const user = await User.findOne({_id: userId});
            
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            console.log("User found by ID: ", user);
            res.json({
                id: user._id,
                avatar: user.avatar,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                birthDate: user.birthDate,
                about: user.about,
                occupation: user.occupation,
                hobbies: user.hobbies
            });
        } catch (error) {
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    }

    analyzeProfilePhoto = async (req: Request, res: Response): Promise<void> => {
        try {
            const { imageBase64 } = req.body;
            console.log(imageBase64);
            if (!imageBase64) {
                res.status(400).json({ message: 'No image provided' });
                return;
            }
            
            if (!this.isValidBase64(imageBase64)) {
                res.status(400).json({ message: 'Invalid image format' });
                return;
            }

            const prompt = `Analyze this dating profile photo and provide brief, constructive feedback.
            Focus only on these aspects:
            1. Composition (framing, angle, background)
            2. Lighting and clarity
            3. Facial expression and posture
            4. Overall profile photo suitability

            Provide feedback as a single concise paragraph (max 3-4 sentences) focusing only on how to make this a better dating profile photo. 
            Do not mention appearance in judgmental ways - focus on technical and practical aspects. 
            Be very brief but helpful. Match the tone of a friendly professional photographer.`;

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType: 'image/jpeg'
                }
            };
            
            const result = await model.generateContent([prompt, imagePart]);
            const response = result.response;
            const text = response.text();
            
            res.status(200).json({ feedback: text });
            
        } catch (error) {
            console.error('Error analyzing profile photo:', error);
            res.status(500).json({ 
                message: 'Failed to analyze photo', 
                error: error.message 
            });
        }
    };

    private isValidBase64(str: string): boolean {
        try {
            if (!str.startsWith('data:image')) {
                if (/^[A-Za-z0-9+/=]+$/.test(str)) {
                    return true;
                }
                return false;
            }
            const base64Regex = /^data:image\/([a-zA-Z]*);base64,([A-Za-z0-9+/=]*)$/;
            const matches = str.match(base64Regex);
            
            return !!matches;
        } catch (e) {
            return false;
        }
    }
}

export default new AuthController();
