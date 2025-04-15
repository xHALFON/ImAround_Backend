import { Request, Response } from 'express';
import * as dotenv from "dotenv";
import Match from "../models/matchModel";

dotenv.config()

class SearchController {
    like = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userLike, userLiked } = req.body;
    
            const searchMatch = await Match.findOne({
                participants: { $all: [userLike, userLiked] }
            });
    
            if (!searchMatch) {
                const match = new Match({
                    participants: [userLike, userLiked],
                    liked: [userLike]
                });
                await match.save();
                res.status(200).json({ message: `${userLike} liked ${userLiked}` });
                return;
            }
    
            if (searchMatch.liked.includes(userLike)) {
                res.status(200).json({ message: `${userLike} already liked ${userLiked}` });
                return;
            }
    
            searchMatch.liked.push(userLike);
            await searchMatch.save();
    
            res.status(201).json({ message: `It's a Match ${userLike} ${userLiked}`});
    
        } catch (error: any) {
            console.log(error.message);
            res.status(500).json({ message: error.message });
        }
    };
}

export default new SearchController();