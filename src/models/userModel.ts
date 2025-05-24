import mongoose, { Document, Schema } from "mongoose"

interface IUser extends Document {
    _id: string;
    avatar: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    birthDate: Date;
    about: string;
    occupation: string;
    gender: string; // Added gender field for user's own gender
    refreshToken: String;
    hobbies: string[];
    dislike: string[];
    genderInterest: String; // Who they're interested in dating
    fcmToken: string; // 🔥 הוסף FCM Token
    lastTokenUpdate: Date; // 🔥 מתי הטוקן עודכן בפעם האחרונה
}

const userSchema = new Schema<IUser>({
    _id: {type: String, required: true },
    avatar: { type: String, required: false},
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    birthDate: { type: Date, required: true },
    about: { type: String, required: false },
    occupation: { type: String, required: false },
    gender: { type: String, required: false }, // Added gender field (Male/Female)
    genderInterest: { type: String, required: false }, // Who they want to date
    hobbies: { type: [String], required: false, default: [] },
    dislike: { type: [String], required: false, default: [] },
    refreshToken: String,
    fcmToken: { type: String, required: false, default: null }, // 🔥 FCM Token חדש
    lastTokenUpdate: { type: Date, required: false, default: Date.now } // 🔥 תאריך עדכון
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;