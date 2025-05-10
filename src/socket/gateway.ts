import { Server, Socket } from 'socket.io';
import SearchController from "../controllers/SearchController"
import app from '..';

// Store active user connections
const userSockets = new Map<string, string>();

export const setupSocketEvents = (io: Server) => {
    io.on('connection', (socket: Socket) => {

        console.log('New client connected', socket.id);
        socket.on('user_connected', (userId: string) => {
            console.log(`User ${userId} connected with socket ${socket.id}`);
            userSockets.set(userId, socket.id);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected', socket.id);
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    console.log(`User ${userId} disconnected`);
                    break;
                }
            }
        });
    });
};

// Helper function to send match notification to a specific user
export const notifyMatch = ( users: string[], matchData: any) => {
    users.forEach(userId => {
        const socketId = userSockets.get(userId);
        if (socketId) {
           app.get('io').to(socketId).emit('new_match', matchData);
            console.log(`Match notification sent to user ${userId}`);
        } else {
            console.log(`User ${userId} is not connected, couldn't send match notification`);
        }
    });
};
