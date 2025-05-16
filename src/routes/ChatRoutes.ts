import express from 'express';
import ChatController from '../controllers/ChatController';

const router = express.Router();

// Get all chats for a user
router.get('/user/:userId', ChatController.getUserChats);

// Get chat by match ID
router.get('/match/:matchId', ChatController.getChatByMatchId);

// Mark messages as read
router.put('/:chatId/read/:userId', ChatController.markMessagesAsRead);

router.get('/details/:userId', ChatController.getUser); 
router.get('/tips/:matchId', ChatController.getChatTips);

export default router;