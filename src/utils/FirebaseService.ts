import * as admin from 'firebase-admin';

class FirebaseService {
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) return;

    try {
      // אופציה 1: באמצעות Service Account Key (מומלץ לפיתוח)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } 
      // אופציה 2: באמצעות קובץ JSON
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault()
        });
      }
      // אופציה 3: הגדרה ידנית (לא מומלץ)
      else {
        console.warn('Firebase Admin not initialized - no credentials found');
        return;
      }

      this.isInitialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    }
  }

  async sendMatchNotification(userToken: string, matchedUserName: string, matchedUserId: string) {
    if (!this.isInitialized) {
      console.log('⚠️ Firebase not initialized, skipping notification');
      return;
    }

    try {
      const message = {
        token: userToken,
        data: {
          type: 'new_match',
          userId: matchedUserId,
          userName: matchedUserName
        },
        notification: {
          title: '🎉 התאמה חדשה!',
          body: `התאמת עם ${matchedUserName}! לחץ לפתיחה`
        },
        android: {
          notification: {
            channelId: 'match_notifications',
            priority: 'high' as any,
            defaultSound: true,
            defaultVibrateTimings: true
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Match notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error sending match notification:', error);
      throw error;
    }
  }

  async sendMessageNotification(
    userToken: string, 
    senderName: string, 
    messageContent: string, 
    matchId: string
  ) {
    if (!this.isInitialized) {
      console.log('⚠️ Firebase not initialized, skipping notification');
      return;
    }

    try {
      const message = {
        token: userToken,
        data: {
          type: 'new_message',
          senderName: senderName,
          message: messageContent.length > 50 
            ? messageContent.substring(0, 50) + '...' 
            : messageContent,
          matchId: matchId
        },
        notification: {
          title: `💬 הודעה חדשה מ${senderName}`,
          body: messageContent.length > 100 
            ? messageContent.substring(0, 100) + '...' 
            : messageContent
        },
        android: {
          notification: {
            channelId: 'match_notifications',
            priority: 'high' as any,
            defaultSound: true,
            defaultVibrateTimings: true
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Message notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error sending message notification:', error);
      throw error;
    }
  }

  async sendNotificationToMultipleTokens(tokens: string[], title: string, body: string, data?: any) {
    if (!this.isInitialized || tokens.length === 0) {
      return;
    }

    try {
      const message = {
        tokens: tokens,
        notification: {
          title: title,
          body: body
        },
        data: data || {},
        android: {
          notification: {
            channelId: 'match_notifications',
            priority: 'high' as any,
            defaultSound: true
          }
        }
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ Sent ${response.successCount} notifications, ${response.failureCount} failures`);
      return response;
    } catch (error) {
      console.error('❌ Error sending batch notifications:', error);
      throw error;
    }
  }
}

export default new FirebaseService();