import { Server } from 'socket.io';
import http from 'http';
import Chat from '../models/ChatModels';
import ChatController from '../controllers/ChatController';
import FirebaseService from '../utils/FirebaseService'; // 🔥 הוסף
import User from '../models/userModel'; // 🔥 הוסף
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
    
    // Handle new chat message - 🔥 עדכן את זה
    socket.on('send_message', async (data: {
      matchId: string,
      sender: string,
      recipient: string,
      content: string
    }) => {
      try {
        // Find the chat for this match
        console.log('hi')
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
        } else {
          // 🔥 אם המשתמש לא מחובר - שלח FCM notification
          console.log(`User ${data.recipient} not connected, sending FCM notification`);
          await sendMessageNotification(data.sender, data.recipient, data.content, data.matchId);
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
    // Handle marking messages as read
    socket.on('mark_messages_as_read', async (data: {
      chatId: string,
      userId: string,
      matchId: string
    }) => {
      try {
        console.log('=== MARK MESSAGES AS READ EVENT ===');
        console.log('Chat ID:', data.chatId);
        console.log('User ID (reader):', data.userId);
        console.log('Match ID:', data.matchId);
        
        // Find the chat
        const chat = await Chat.findById(data.chatId);
        
        if (!chat) {
          console.log('ERROR: Chat not found for ID:', data.chatId);
          return socket.emit('message_error', { error: 'Chat not found' });
        }
        
        console.log('Found chat with', chat.messages.length, 'messages');
        console.log('Chat participants:', chat.participants);
        
        // Mark messages as read where the sender is not the current user
        let updated = false;
        let updatedCount = 0;
        let messagesSenders = new Set<string>(); // Track who sent the messages that were marked as read
        
        chat.messages.forEach(message => {
          const messageSender = message.sender.toString();
          const currentUserId = data.userId.toString();
          
          if (messageSender !== currentUserId && !message.read) {
            console.log('Marking message as read:', message.content.substring(0, 30) + '...');
            message.read = true;
            updated = true;
            updatedCount++;
            messagesSenders.add(messageSender); // Add sender to the set
          }
        });
        
        console.log('Updated', updatedCount, 'messages');
        
        if (updated) {
          await chat.save();
          console.log('Chat saved successfully');
          
          // Send messages_read event only to the senders of the messages that were marked as read
          messagesSenders.forEach(senderId => {
            const senderSocketId = userSockets.get(senderId);
            console.log(`Checking sender ${senderId}, socket ID: ${senderSocketId}`);
            
            if (senderSocketId) {
              console.log('Sending messages_read event to sender:', senderId);
              io.to(senderSocketId).emit('messages_read', {
                matchId: data.matchId,
                readBy: data.userId
              });
              console.log('messages_read event sent successfully to:', senderId);
            } else {
              console.log('Sender socket not found - user not connected:', senderId);
            }
          });
        } else {
          console.log('No messages needed to be updated');
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('message_error', { error: 'Failed to mark messages as read' });
      }
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

// 🔥 הוסף פונקציה חדשה לFCM הודעות
const sendMessageNotification = async (
  senderId: string, 
  recipientId: string, 
  messageContent: string, 
  matchId: string
) => {
  try {
    // קבל נתוני השולח והמקבל
    const [sender, recipient] = await Promise.all([
      User.findById(senderId),
      User.findById(recipientId)
    ]);
    
    if (!recipient?.fcmToken) {
      console.log(`Recipient ${recipientId} has no FCM token`);
      return;
    }
    
    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Someone';
    
    await FirebaseService.sendMessageNotification(
      recipient.fcmToken,
      senderName,
      messageContent,
      matchId
    );
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
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