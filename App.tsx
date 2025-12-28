import React, { useState, useEffect, useCallback } from 'react';
import { User, Conversation, Message, ScreenState } from './types';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ProfileModal from './components/ProfileModal';
import NewChatModal from './components/NewChatModal';
import { generateReply } from './services/geminiService';
import { 
  auth, 
  subscribeToConversations, 
  sendMessageToConversation, 
  createNewConversation,
  logoutUser,
  db
} from './services/firebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('auth');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [authLoading, setAuthLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  // Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  // Resize handler
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setGlobalError(null);
      try {
        if (firebaseUser) {
          // Fetch full user profile from Firestore
          try {
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            if (userDoc.exists()) {
              setCurrentUser({ id: userDoc.id, ...userDoc.data() } as User);
              setScreenState('chat');
            } else {
              // User in Auth but not in DB (rare sync issue or DB missing)
              console.warn("User authenticated but no profile found in Firestore.");
              // We create a temporary user object so they aren't stuck
              setCurrentUser({
                id: firebaseUser.uid,
                username: firebaseUser.email?.split('@')[0] || 'user',
                name: firebaseUser.displayName || 'User',
                avatar: firebaseUser.photoURL || '',
                isOnline: true
              });
              setScreenState('chat');
            }
          } catch (dbError: any) {
             console.error("Firestore Error:", dbError);
             if (dbError.code === 'not-found' || dbError.message.includes('not exist')) {
               setGlobalError("Setup Required: Firestore Database not found. Please go to Firebase Console > Firestore Database and click 'Create Database'.");
             } else {
               setGlobalError("Connection Error: Could not reach database. You might be offline.");
             }
             // Allow login state even if DB fails, so they can see the error
             setScreenState('chat');
             setCurrentUser({
                id: firebaseUser.uid,
                username: 'offline_user',
                name: firebaseUser.displayName || 'User',
                avatar: firebaseUser.photoURL || '',
                isOnline: true
             });
          }
        } else {
          setCurrentUser(null);
          setScreenState('auth');
        }
      } catch (err) {
        console.error("Auth State Error", err);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Conversations Listener
  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      return;
    }
    
    // Safety check before subscribing
    try {
      const unsubscribe = subscribeToConversations(currentUser.id, (updatedConvs) => {
        setConversations(updatedConvs);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Failed to subscribe to conversations", e);
      return () => {};
    }
  }, [currentUser]);

  const handleLogout = async () => {
    await logoutUser(currentUser?.id);
    setActiveConvId(null);
    setShowProfile(false);
  };

  const handleStartChat = async (targetUser: User) => {
    if (!currentUser) return;
    
    // Check if we already have a chat with this user
    const existing = conversations.find(c => 
      c.type === 'private' && c.participantIds.includes(targetUser.id)
    );

    if (existing) {
      setActiveConvId(existing.id);
    } else {
      try {
        const newId = await createNewConversation(currentUser, targetUser);
        setActiveConvId(newId);
      } catch (e) {
        alert("Failed to start chat. Check database connection.");
      }
    }
    setShowNewChat(false);
  };

  const handleSendMessage = useCallback(async (text: string) => {
    if (!activeConvId || !currentUser) return;

    const newMessage: Message = {
      conversationId: activeConvId,
      senderId: currentUser.id,
      text: text,
      timestamp: Date.now(),
      status: 'sent'
    };

    try {
      // Send to Firebase
      await sendMessageToConversation(activeConvId, newMessage);

      // AI Logic Integration
      const conversation = conversations.find(c => c.id === activeConvId);
      if (!conversation) return;

      const otherUser = conversation.participants.find(p => p.id !== currentUser.id);
      const isAI = otherUser?.username.toLowerCase().includes('gemini') || 
                   otherUser?.username.toLowerCase().includes('bot') || 
                   conversation.personaPrompt;

      if (isAI) {
        try {
          const replyText = await generateReply(
            activeConvId,
            [], 
            text,
            conversation.personaPrompt || `You are ${otherUser?.name}, a cool person on this chat app.`,
            currentUser.id
          );

          const replyMessage: Message = {
            conversationId: activeConvId,
            senderId: otherUser?.id || 'bot',
            text: replyText,
            timestamp: Date.now(),
            status: 'delivered'
          };
          
          await sendMessageToConversation(activeConvId, replyMessage);

        } catch (error) {
           console.error("AI Error", error);
        }
      }
    } catch (e) {
      console.error("Send message error", e);
      alert("Failed to send message. You might be offline.");
    }
  }, [activeConvId, currentUser, conversations]);

  const handleBack = () => {
    setActiveConvId(null);
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (screenState === 'auth') {
    return <Auth onLogin={() => {}} />;
  }

  const activeConversation = conversations.find(c => c.id === activeConvId);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Global Error Banner */}
      {globalError && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm text-center font-medium z-50 shadow-md">
          {globalError}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`
          ${isMobile ? (activeConvId ? 'hidden' : 'w-full') : 'w-80 lg:w-96'} 
          flex-shrink-0 z-10 h-full
        `}>
          {currentUser && (
            <Sidebar 
              conversations={conversations}
              activeConversationId={activeConvId}
              onSelectConversation={setActiveConvId}
              currentUser={currentUser}
              onNewChat={() => setShowNewChat(true)}
              onProfileClick={() => setShowProfile(true)}
            />
          )}
        </div>

        {/* Main Chat Area */}
        <div className={`
          flex-1 flex flex-col h-full
          ${isMobile ? (activeConvId ? 'block' : 'hidden') : 'block'}
        `}>
          {activeConversation && currentUser ? (
            <ChatWindow 
              conversation={activeConversation}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              onBack={handleBack}
            />
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50/50">
               {/* Empty State UI */}
               <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-6">
                 <svg className="w-12 h-12 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                 </svg>
               </div>
               <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Patr</h2>
               <p className="text-gray-500 max-w-sm">Select a conversation or start a new one.</p>
               <button 
                onClick={() => setShowNewChat(true)}
                className="mt-6 px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition-colors"
               >
                 Start Messaging
               </button>
            </div>
          )}
        </div>

        {/* Modals */}
        {showProfile && currentUser && (
          <ProfileModal 
            user={currentUser} 
            onClose={() => setShowProfile(false)} 
            onUpdate={setCurrentUser}
            onLogout={handleLogout}
          />
        )}

        {showNewChat && currentUser && (
          <NewChatModal 
            currentUser={currentUser}
            onClose={() => setShowNewChat(false)}
            onStartChat={handleStartChat}
          />
        )}
      </div>
    </div>
  );
};

export default App;