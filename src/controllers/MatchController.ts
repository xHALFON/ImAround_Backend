import { Request, Response } from 'express';
import * as dotenv from "dotenv";
import Match from "../models/matchModel";
import User from "../models/userModel";
import { match } from 'assert';
import { notifyMatch } from '../socket/gateway';
import ChatController from './ChatController';
import FirebaseService from '../utils/FirebaseService'; // 🔥 הוסף זה

dotenv.config()

class MatchController {
    like = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userLike, userLiked } = req.body;
            console.log("1")
            
            const searchMatch = await Match.findOne({
                participants: { $all: [userLike, userLiked] }
            });
    
            if (!searchMatch) {
                const match = new Match({
                    participants: [userLike, userLiked],
                    liked: [userLike],
                    seen: false,
                });
                await match.save();
                console.log("2")
                res.status(200).json({ 
                    message: `${userLike} liked ${userLiked}`,
                    isMatch: false
                });
                return;
            }
    
            if (searchMatch.liked.includes(userLike)) {
                console.log("3")
                res.status(200).json({ 
                    message: `${userLike} already liked ${userLiked}`,
                    isMatch: searchMatch.liked.length >= 2,
                    matchDetails: searchMatch.liked.length >= 2 ? searchMatch : null
                });
                return;
            }
            
            console.log(searchMatch.participants)
            searchMatch.liked.push(userLike);
            await searchMatch.save();
            console.log("5")
            
            // שלח Socket notification
            notifyMatch(searchMatch.participants, searchMatch);
            
            // 🔥 שלח FCM notifications אם זה התאמה חדשה (שני לייקים)
            if (searchMatch.liked.length >= 2) {
                await this.sendMatchNotifications(searchMatch.participants);
            }
            
            res.status(200).json({ 
                message: "Like processed successfully",
                isMatch: searchMatch.liked.length >= 2,
                matchDetails: searchMatch.liked.length >= 2 ? searchMatch : null
            });
    
        } catch (error: any) {
            console.log(error.message);
            res.status(500).json({ message: error.message });
        }
    };

    // 🔥 פונקציה חדשה לשליחת התראות התאמה
    private sendMatchNotifications = async (participantIds: string[]) => {
        try {
            // קבל נתוני המשתמשים
            const users = await User.find({ _id: { $in: participantIds } });
            
            for (const user of users) {
                if (user.fcmToken) {
                    // מצא את המשתמש השני
                    const otherUser = users.find(u => u._id.toString() !== user._id.toString());
                    
                    if (otherUser) {
                        await FirebaseService.sendMatchNotification(
                            user.fcmToken,
                            `${otherUser.firstName} ${otherUser.lastName}`,
                            otherUser._id.toString()
                        );
                    }
                } else {
                    console.log(`User ${user._id} has no FCM token`);
                }
            }
        } catch (error) {
            console.error('Error sending match notifications:', error);
        }
    };

    dislike = async (req: Request, res: Response): Promise<void> => {
        const { userLike, userLiked } = req.body;
        try {
            const user = await User.findOne({_id: userLike});
            if (!user.dislike.includes(userLiked)) {
                user.dislike.push(userLiked);
                await user.save();
            }
            res.status(200).json({ message: "User disliked successfully" });
        } catch (error: any) {
            console.log(error.message);
            res.status(500).json({ message: error.message });
        }
    }

    // 🔥 API endpoint לשמירת FCM token
    saveFCMToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId, token } = req.body;
            
            await User.findByIdAndUpdate(userId, {
                fcmToken: token,
                lastTokenUpdate: new Date()
            });
            
            console.log(`FCM token saved for user ${userId}`);
            res.status(200).json({ message: "FCM token saved successfully" });
        } catch (error: any) {
            console.error('Error saving FCM token:', error);
            res.status(500).json({ message: error.message });
        }
    };
}

export default new MatchController();