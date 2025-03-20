import mongoose, { Document, Schema } from "mongoose"

interface IUser extends Document {
    _id: string;
    username: string;
    email: string;
    password: string;
    refreshToken: String;
}

const userSchema = new Schema<IUser>({
    _id: {type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    refreshToken: String,
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;