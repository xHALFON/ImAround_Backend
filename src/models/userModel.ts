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
    occupation: string; // Added occupation field
    refreshToken: String;
    hobbies: string[]; // Added hobbies field
    dislike: string[];
    genderInterest: String;
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
    occupation: { type: String, required: false }, // Added occupation field
    genderInterest: { type: String, required: false },
    hobbies: { type: [String], required: false, default: [] }, // Added hobbies array field
    dislike: { type: [String], required: false, default: [] },
    refreshToken: String,
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;