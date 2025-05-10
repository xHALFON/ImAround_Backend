import { Request, Response } from 'express';
import Chat, { IChat } from '../models/ChatModels';
import Match from '../models/matchModel';

class ChatController {
  // Create a new chat when a match is formed
  createChat = async (matchId: string, participants: string[]) => {
    try {
      // Check if chat already exists for this match
      const existingChat = await Chat.findOne({ matchId });
      if (existingChat) {
        return existingChat;
      }
      
      // Create new chat
      const newChat = new Chat({
        matchId,
        participants,
        messages: [],
        lastActivity: new Date(),
      });
      
      await newChat.save();
      return newChat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  };

  // Get all chats for a user
  getUserChats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      
      // Find all chats where the user is a participant
      const chats = await Chat.find({ participants: userId })
        .sort({ lastActivity: -1 }); // Sort by most recent activity
      
      res.status(200).json(chats);
    } catch (error) {
      console.error('Error fetching user chats:', error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get a specific chat by matchId
  getChatByMatchId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { matchId } = req.params;
      
      const chat = await Chat.findOne({ matchId });
      if (!chat) {
        res.status(404).json({ message: 'Chat not found' });
        return;
      }
      
      res.status(200).json(chat);
    } catch (error) {
      console.error('Error fetching chat:', error);
      res.status(500).json({ message: error.message });
    }
  };

  // Mark all messages in a chat as read for a specific user
  markMessagesAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { chatId, userId } = req.params;
      
      const chat = await Chat.findById(chatId);
      if (!chat) {
        res.status(404).json({ message: 'Chat not found' });
        return;
      }
      
      // Only mark messages from the other participant as read
      let updated = false;
      chat.messages.forEach(message => {
        if (message.sender !== userId && !message.read) {
          message.read = true;
          updated = true;
        }
      });
      
      if (updated) {
        await chat.save();
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ message: error.message });
    }
  };
}

export default new ChatController();