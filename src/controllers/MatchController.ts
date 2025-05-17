import { Request, Response } from 'express';
import * as dotenv from "dotenv";
import Match from "../models/matchModel";
import User from "../models/userModel";
import { match } from 'assert';
import { notifyMatch } from '../socket/gateway';
import ChatController from './ChatController';

dotenv.config()

class SearchController {
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
                res.status(200).json({ message: `${userLike} liked ${userLiked}` });
                return;
            }
    
            if (searchMatch.liked.includes(userLike)) {
                console.log("3")
                res.status(200).json({ message: `${userLike} already liked ${userLiked}` });
                return;
            }
            console.log(searchMatch.participants)
            searchMatch.liked.push(userLike);
            await searchMatch.save();
            console.log("5")
            notifyMatch(searchMatch.participants,searchMatch)
    
        } catch (error: any) {
            console.log(error.message);
            res.status(500).json({ message: error.message });
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
}

export default new SearchController();





