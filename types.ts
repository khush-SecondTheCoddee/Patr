export interface User {
  id: string;
  username: string; 
  name: string; 
  avatar: string;
  about?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isSystem?: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: User[]; 
  messages?: Message[]; // Optional, usually fetched separately
  lastMessage?: Message;
  unreadCount: number;
  isTyping?: boolean;
  themeColor?: string;
  personaPrompt?: string; 
  type: 'private' | 'group';
}

export type ScreenState = 'auth' | 'chat';