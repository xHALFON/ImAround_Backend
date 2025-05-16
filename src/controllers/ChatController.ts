import { Request, Response } from 'express';
import Chat, { IChat } from '../models/ChatModels';
import User from '../models/userModel'
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  getChatTips = async (req: Request, res: Response): Promise<void> => {
    try {
      const { matchId } = req.params;
      
      // קבלת נתוני הצ'אט
      const chat = await Chat.findOne({ matchId }).populate('participants');
      if (!chat) {
        res.status(404).json({ message: 'Chat not found' });
        return;
      }
      
      // קבלת פרטי המשתמשים
      const [user1, user2] = await Promise.all(
        chat.participants.map(userId => User.findById(userId))
      );
      
      if (!user1 || !user2) {
        res.status(404).json({ message: 'Users not found' });
        return;
      }
      
      // הכנת הטקסט לשליחה ל-AI
      const prompt = `You are a dating conversation coach. Give exactly 3-5 conversation tips for two people who matched on a dating app.
  
  Person 1 hobbies: ${user1.hobbies.join(', ') || 'No hobbies listed'}
  Person 2 hobbies: ${user2.hobbies.join(', ') || 'No hobbies listed'}
  
  Provide conversation tips and starters based on their interests. Each tip should be one sentence.
  
  Respond ONLY with a valid JSON array format like this example:
  ["Ask about their favorite hobby and why they enjoy it", "Share a funny story about one of your hobbies", "Suggest a hobby-related activity you could do together"]
  
  Do not include any other text, explanations, or formatting.`;
      
      // שליחה ל-Gemini API
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('Raw AI response:', text); // לוג לבדיקה
      
      // ניסיון לפרסר כ-JSON, אם לא אז נחזיר כטקסט פשוט
      let tips: string[];
      try {
        // ניקוי התגובה מתווים מיותרים
        let cleanText = text.trim();
        
        // חיפוש אחר JSON array
        const jsonMatch = cleanText.match(/\[[\s\S]*?\]/);
        
        if (jsonMatch) {
          tips = JSON.parse(jsonMatch[0]);
        } else {
          // אם אין JSON, ננסה לחלץ טיפים בדרכים אחרות
          // חיפוש אחר שורות שמתחילות ב-1. או - או •
          const lines = cleanText.split('\n');
          tips = [];
          
          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.match(/^[\d+\.\-\•]/)) {
              const tip = cleanLine.replace(/^[\d+\.\-\•\s]+/, '').trim();
              if (tip.length > 10) {
                tips.push(tip);
              }
            } else if (cleanLine.length > 20 && !cleanLine.includes('Person') && !cleanLine.includes('tip')) {
              // שורה שנראית כמו טיפ
              tips.push(cleanLine);
            }
          }
          
          // אם עדיין אין טיפים, נסה לפצל לפי נקודות
          if (tips.length === 0) {
            const sentences = cleanText.split(/[\.!]/)
              .map(s => s.trim())
              .filter(s => s.length > 20);
            tips = sentences.slice(0, 5);
          }
        }
        
        // מגביל ל-5 טיפים מקסימום ומנקה
        tips = tips.slice(0, 5).map(tip => 
          tip.replace(/^["'\s]+|["'\s]+$/g, '').trim()
        );
        
        // וודא שיש לפחות טיפ אחד
        if (tips.length === 0) {
          tips = ['Ask about their hobbies and what they enjoy doing in their free time!'];
        }
      } catch (e) {
        console.error('Error parsing AI response:', e);
        console.error('Raw response was:', text);
        tips = [
          'Ask about their most interesting hobby!',
          'Share an interesting experience related to your shared hobby',
          'Suggest doing something together related to your mutual hobbies'
        ];
      }
      
      res.status(200).json({ tips });
      
    } catch (error) {
      console.error('Error getting chat tips:', error);
      res.status(500).json({ message: error.message });
    }
  };
}

export default new ChatController();