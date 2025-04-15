import mongoose, { Document, Schema } from "mongoose"

interface IMatch extends Document {
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