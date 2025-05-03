import { Request, Response } from 'express';
import * as dotenv from "dotenv";
import Match from "../models/matchModel";
import { notifyMatch, getSocketIO } from '../socket/gateway';

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
                    liked: [userLike],
                    seen: false,
                });
                await match.save();
                res.status(200).json({ isMatch: false, message: `${userLike} liked ${userLiked}` });
                return;
            }
    
            if (searchMatch.liked.includes(userLike)) {
                res.status(200).json({ isMatch: false, message: `${userLike} already liked ${userLiked}` });
                return;
            }
    
            searchMatch.liked.push(userLike);
            searchMatch.seen = false;
            await searchMatch.save();
            
            const matchDetails = await Match.findById(searchMatch._id)
                .populate({
                    path: 'participants',
                    match: { _id: { $ne: userLike } }
                });
            
            // Check if it's a match (both users liked each other)
            if (searchMatch.liked.length === 2) {
                // Get Socket.IO instance
                const io = getSocketIO(req.app);
                
                // Notify both participants about the match
                notifyMatch(io, searchMatch.participants, {
                    _id: searchMatch._id,
                    participants: searchMatch.participants,
                    matchedWith: userLiked,
                    seen: false
                });
            }
            
            res.status(201).json({ 
                isMatch: searchMatch.liked.length === 2, 
                message: searchMatch.liked.length === 2 ? 
                    `It's a Match ${userLike} ${userLiked}` : 
                    `${userLike} liked ${userLiked}`,
                matchDetails: {
                    _id: searchMatch._id,
                    participants: searchMatch.participants,
                    liked: searchMatch.liked,
                    seen: searchMatch.seen
                }
            });
    
        } catch (error: any) {
            console.log(error.message);
            res.status(500).json({ message: error.message });
        }
    };

    checkMatch = async (req: Request, res: Response): Promise<void> => {
        try{
            const { userId } = req.params;
            
            const matchFields = await Match.find({
                participants: { $in: [userId] },
                liked: { $size: 2 }
            });
            
            const matches = [];
            
            for(const matchField of matchFields){
                matches.push(matchField.toObject());
                
                if (!matchField.seen) {
                    matchField.seen = true;
                    await matchField.save();
                    
                    // Get Socket.IO instance
                    const io = getSocketIO(req.app);
                    
                    // Notify other participant that match was seen
                    const otherParticipant = matchField.participants.find(p => p.toString() !== userId);
                    if (otherParticipant) {
                        notifyMatch(io, [otherParticipant], {
                            _id: matchField._id,
                            participants: matchField.participants,
                            matchSeen: true,
                            seenBy: userId
                        });
                    }
                }
            }
            
            res.status(200).json({matches: matches});
        } catch(e){
            res.status(500).json("Error in checking match:" + e);
        }
    }
    
    getMatchById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { matchId } = req.params;
            const match = await Match.findById(matchId);
            
            if (!match) {
                res.status(404).json({ message: "Match not found" });
                return;
            }
            
            res.status(200).json(match);
        } catch (e) {
            res.status(500).json("Error fetching match: " + e);
        }
    }
}

export default new SearchController();