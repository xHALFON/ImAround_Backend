import { Server } from 'http';
import app from './index';
import * as dotenv from 'dotenv';
import { setupSocketEvents } from './socket/gateway';
import socket from 'socket.io' ;
dotenv.config();

const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
   console.log(`Server is running on port ${PORT}`); 
});

const io = new socket.Server(server);
setupSocketEvents(io);
app.set('io', io);

