import express from 'express'
import bodyParser from 'body-parser';
import { connectDB } from './utils/connectDB';
import authRoutes from './routes/authRoutes'

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))

app.get("/", (req, res) => {
    res.send("Server is running!");
});

connectDB();

app.use("/auth", authRoutes)

export default app;