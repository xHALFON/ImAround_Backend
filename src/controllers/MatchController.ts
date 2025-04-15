import { Request, Response } from 'express';
import * as dotenv from "dotenv";
import Match from "../models/matchModel";
import { match } from 'assert';

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

    checkMatch = async (req: Request, res: Response): Promise<void> => {
        try{
            const { userId } = req.params;
            const matchFields = await Match.find({participants: {$in: userId}})
            const matchs = [];
            for(const matchField of matchFields){
                if(matchField.liked.length == 2){
                    console.log(matchField);
                    matchs.push(matchField.toObject());
                    console.log(matchs);
                }
                matchField.seen = true;
                matchField.save();
            }
            
            res.status(200).json({matchs: matchs});
        } catch(e){
            res.status(500).json("Error in checking match:" + e);
        }
    }
}

export default new SearchController();