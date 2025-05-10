import mongoose, { Document, Schema, Types } from "mongoose"

interface IMatch extends Document {
    _id: Types.ObjectId;
    participants: string[]; 
    liked: string[];  
    seen: boolean
}

const matchSchema = new Schema<IMatch>({
    participants: [{ type: String, ref: 'User' }],
    liked: [{ type: String, ref: 'User', required: true }],
    seen: {type: Boolean, default: false},
});

const Match = mongoose.model<IMatch>('Match', matchSchema);
export default Match;