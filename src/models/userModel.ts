import mongoose, { Document, Schema } from "mongoose"

interface IUser extends Document {
    _id: string;
    avatar: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    birthDate: Date;
    refreshToken: String;
}

const userSchema = new Schema<IUser>({
    _id: {type: String, required: true },
    avatar: { type: String, required: true},
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    birthDate: { type: Date, required: true },
    refreshToken: String,
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;