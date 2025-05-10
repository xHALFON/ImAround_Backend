import { Server } from 'socket.io';
import http from 'http';
import Chat from '../models/ChatModels';
import ChatController from '../controllers/ChatController';
import app from '..'

const userSockets = new Map<string, string>(); // userId -> socketId

export const setupSocketServer = (server: http.Server) => {
  const io = new Server(server);
  app.set('io', io);

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // User connects to socket
    socket.on('user_connected', (userId: string) => {
      userSockets.set(userId, socket.id);
      console.log(`User ${userId} connected with socket ${socket.id}`);
    });
    
    // User disconnects
    socket.on('disconnect', () => {
      // Remove user from userSockets map
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
    
    // Handle new chat message
    socket.on('send_message', async (data: {
      matchId: string,
      sender: string,
      recipient: string,
      content: string
    }) => {
      try {
        // Find the chat for this match
        let chat = await Chat.findOne({ matchId: data.matchId });
        
        // If chat doesn't exist yet, create it
        if (!chat) {
          chat = await ChatController.createChat(data.matchId, [data.sender, data.recipient]);
        }
        
        // Add message to chat
        const newMessage = {
          sender: data.sender,
          content: data.content,
          timestamp: new Date(),
          read: false
        };
        
        chat.messages.push(newMessage);
        chat.lastActivity = new Date();
        await chat.save();
        
        // Emit message to recipient if online
        const recipientSocketId = userSockets.get(data.recipient);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new_message', {
            matchId: data.matchId,
            message: newMessage
          });
        }
        
        // Send confirmation to sender
        socket.emit('message_sent', {
          matchId: data.matchId,
          message: newMessage
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });
    
    // Handle typing indicator
    socket.on('typing', (data: { matchId: string, userId: string }) => {
      // Find the other participant in the match
      Chat.findOne({ matchId: data.matchId })
        .then(chat => {
          if (chat) {
            const otherUserId = chat.participants.find(id => id !== data.userId);
            if (otherUserId) {
              const otherUserSocketId = userSockets.get(otherUserId);
              if (otherUserSocketId) {
                io.to(otherUserSocketId).emit('typing_indicator', {
                  matchId: data.matchId,
                  userId: data.userId,
                  isTyping: true
                });
              }
            }
          }
        })
        .catch(err => console.error('Error handling typing indicator:', err));
    });
    
    // Handle stopped typing
    socket.on('stop_typing', (data: { matchId: string, userId: string }) => {
      // Similar to typing but with isTyping: false
      Chat.findOne({ matchId: data.matchId })
        .then(chat => {
          if (chat) {
            const otherUserId = chat.participants.find(id => id !== data.userId);
            if (otherUserId) {
              const otherUserSocketId = userSockets.get(otherUserId);
              if (otherUserSocketId) {
                io.to(otherUserSocketId).emit('typing_indicator', {
                  matchId: data.matchId,
                  userId: data.userId,
                  isTyping: false
                });
              }
            }
          }
        })
        .catch(err => console.error('Error handling stop typing:', err));
    });
  });
  
  return io;
};

// Modify this to also create a chat when a match is created
export const notifyMatch = async (users: string[], matchData: any) => {
  try {
    // Create a chat for the new match
    await ChatController.createChat(matchData._id, users);
    
    // Send notifications to users
    users.forEach(userId => {
      const socketId = userSockets.get(userId);
      if (socketId) {
        app.get('io').to(socketId).emit('new_match', matchData);
        console.log(`Match notification sent to user ${userId}`);
      } else {
        console.log(`User ${userId} is not connected, couldn't send match notification`);
      }
    });
  } catch (error) {
    console.error("Error sending match notification:", error);
  }
};