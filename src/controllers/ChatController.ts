import { Request, Response } from 'express';
import Chat, { IChat } from '../models/ChatModels';
import User from '../models/userModel'

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
    
    console.log('=== API MARK MESSAGES AS READ ===');
    console.log('Chat ID:', chatId);
    console.log('User ID:', userId);
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      console.log('Chat not found');
      res.status(404).json({ message: 'Chat not found' });
      return;
    }
    
    console.log('Found chat with', chat.messages.length, 'messages');
    
    // Debug: Check each message
    console.log('=== API MESSAGE STATUS CHECK ===');
    chat.messages.forEach((message, index) => {
      console.log(`Message ${index}:`);
      console.log(`  Content: ${message.content.substring(0, 30)}...`);
      console.log(`  Sender: ${message.sender}`);
      console.log(`  Read: ${message.read}`);
      console.log(`  Is from current user: ${message.sender.toString() === userId.toString()}`);
      console.log(`  Should update: ${message.sender.toString() !== userId.toString() && !message.read}`);
    });
    
    // Only mark messages from the other participant as read
    // Convert both to string for proper comparison
    let updated = false;
    let updatedCount = 0;
    chat.messages.forEach(message => {
      const messageSender = message.sender.toString();
      const currentUserId = userId.toString();
      
      if (messageSender !== currentUserId && !message.read) {
        console.log('API: Marking message as read:', message.content.substring(0, 30) + '...');
        message.read = true;
        updated = true;
        updatedCount++;
      }
    });
    
    console.log('API: Updated', updatedCount, 'messages');
    
    if (updated) {
      await chat.save();
      console.log('API: Chat saved successfully');
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: error.message });
  }
};

getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    // Fetch only needed fields
    const user = await User.findById(userId)
      .select('firstName lastName avatar')
      .exec();
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar || ""
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: error.message });
  }
  };
}

export default new ChatController();