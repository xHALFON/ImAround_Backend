import express from 'express'
import bodyParser from 'body-parser';
import { connectDB } from './utils/connectDB';
import authRoutes from './routes/authRoutes';
import searchRoutes from './routes/searchRoutes';
import matchRoutes from './routes/matchRoutes'
import cors from 'cors'

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))
/*app.use(cors());*/
app.use(cors({
    origin: '*', // your phone’s IP or allowed domain
    methods: ['GET', 'POST'], 
  }));

app.get("/", (req, res) => {
    res.send("Server is running!");
});

connectDB();

app.use("/auth", authRoutes)
app.use("/search", searchRoutes)
app.use("/match", matchRoutes)

export default app;