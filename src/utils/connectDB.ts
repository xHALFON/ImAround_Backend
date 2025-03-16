import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config()

export const connectDB = async () => {
    try{
        await mongoose.connect(process.env.DB_URL as string);
        console.log("Database connected!");
        
    } catch(err){
        throw `failed to connect DB: ${err}`
    }
}