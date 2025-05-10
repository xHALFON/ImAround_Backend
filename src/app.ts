import { Server } from 'http';
import app from './index';
import * as dotenv from 'dotenv';
import { setupSocketServer } from './socket/gateway';
dotenv.config();

const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
   console.log(`Server is running on port ${PORT}`); 
});

setupSocketServer(server);

