import mongoose, { Document, Schema } from "mongoose"

interface IMatch extends Document {
    participants: string[]; 
    liked: string[];  
}

const matchSchema = new Schema<IMatch>({
    participants: [{ type: String, ref: 'User' }],
    liked: [{ type: String, ref: 'User', required: true }],
});

const Match = mongoose.model<IMatch>('Match', matchSchema);
export default Match;