import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessage {
  sender: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface IChat extends Document {
  matchId: Types.ObjectId;
  participants: string[];
  messages: IMessage[];
  lastActivity: Date;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  sender: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const ChatSchema = new Schema<IChat>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true, unique: true },
    participants: [{ type: String, required: true }],
    messages: [MessageSchema],
    lastActivity: { type: Date, default: Date.now }
    // no need to manually add createdAt
  },
  { timestamps: true } // adds createdAt and updatedAt
);

export default mongoose.model<IChat>('Chat', ChatSchema);
