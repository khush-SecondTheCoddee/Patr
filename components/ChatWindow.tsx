import React, { useRef, useEffect, useState } from 'react';
import { Conversation, Message, User } from '../types';
import { subscribeToMessages } from '../services/firebaseService';
import { PhoneIcon, VideoIcon, InfoIcon, ArrowLeftIcon, SmileIcon, ImageIcon, SendIcon, PlusIcon } from './Icons';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  onSendMessage: (text: string) => void;
  onBack: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  conversation, 
  currentUser, 
  onSendMessage,
  onBack
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const otherUser = conversation.participants.find(p => p.id !== currentUser.id);

  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversation.id, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [conversation.id]);

  // Scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!otherUser) return null;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white/95 backdrop-blur z-20 shadow-sm">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="md:hidden mr-2 p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          
          <div className="relative cursor-pointer">
            <img 
              src={otherUser.avatar} 
              alt={otherUser.name} 
              className="w-10 h-10 rounded-full object-cover border border-gray-100"
            />
            {otherUser.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <div className="ml-3 cursor-pointer">
            <h3 className="font-semibold text-gray-900 leading-tight">{otherUser.name}</h3>
            <span className="text-xs text-gray-500 block">
              {otherUser.isOnline ? 'Active now' : otherUser.lastSeen || 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-primary-600">
          <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors">
            <PhoneIcon className="w-6 h-6" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors">
            <VideoIcon className="w-6 h-6" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors">
            <InfoIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {/* Placeholder / Start of convo */}
        <div className="flex flex-col items-center justify-center py-10 opacity-60">
           <img src={otherUser.avatar} className="w-24 h-24 rounded-full mb-4 object-cover" />
           <h3 className="text-xl font-bold text-gray-800">{otherUser.name}</h3>
           <p className="text-sm text-gray-500">Patr • {otherUser.name} • Instagram</p>
           <button className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-200">View Profile</button>
        </div>

        {/* Message List */}
        {messages.map((msg: Message, index: number, arr: Message[]) => {
          const isMe = msg.senderId === currentUser.id;
          const isLastFromUser = index === arr.length - 1 || arr[index + 1].senderId !== msg.senderId;
          
          return (
            <div 
              key={msg.id || index} 
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group message-enter`}
            >
              {!isMe && (
                <div className={`w-8 h-8 mr-2 flex-shrink-0 ${!isLastFromUser ? 'invisible' : ''}`}>
                   <img src={otherUser.avatar} className="w-8 h-8 rounded-full object-cover" />
                </div>
              )}
              
              <div className={`max-w-[70%] relative ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`px-4 py-2.5 text-[15px] leading-relaxed shadow-sm break-words
                    ${isMe 
                      ? 'bg-primary-500 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm'
                    }
                    ${!isLastFromUser && isMe ? 'rounded-br-md' : ''}
                    ${!isLastFromUser && !isMe ? 'rounded-bl-md' : ''}
                  `}
                >
                  {msg.text}
                </div>
                {isLastFromUser && (
                   <span className="text-[10px] text-gray-400 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                   </span>
                )}
              </div>
            </div>
          );
        })}
        
        {conversation.isTyping && (
          <div className="flex justify-start message-enter">
             <div className="bg-gray-100 rounded-2xl px-4 py-3 flex space-x-1">
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100 sticky bottom-0 z-20">
        <div className="flex items-end space-x-2">
          <div className="flex items-center space-x-2 pb-3 text-primary-600 hidden sm:flex">
             <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
               <PlusIcon className="w-6 h-6" />
             </button>
             <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
               <ImageIcon className="w-6 h-6" />
             </button>
          </div>
          
          <div className="flex-1 bg-gray-100 rounded-[22px] flex items-center px-4 py-2 min-h-[44px]">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Message..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 py-1"
            />
            <button className="ml-2 text-gray-500 hover:text-gray-700">
               <SmileIcon className="w-6 h-6" />
            </button>
          </div>

          <button 
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className={`p-2.5 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 ${
              inputText.trim() 
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' 
                : 'text-gray-300 bg-transparent cursor-default'
            }`}
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;