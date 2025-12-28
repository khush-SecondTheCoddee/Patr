import React from 'react';
import { Conversation, User } from '../types';
import { SearchIcon, PlusIcon } from './Icons';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  currentUser: User;
  onNewChat: () => void;
  onProfileClick: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  conversations, 
  activeConversationId, 
  onSelectConversation,
  currentUser,
  onNewChat,
  onProfileClick,
  className = ""
}) => {
  // Sort conversations by last message timestamp
  const sortedConversations = [...conversations].sort((a, b) => {
    const tA = a.lastMessage?.timestamp || 0;
    const tB = b.lastMessage?.timestamp || 0;
    return tB - tA;
  });

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onProfileClick}
        >
          <div className="relative">
            <img 
              src={currentUser.avatar} 
              alt="Profile" 
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Chats</h2>
        </div>
        <button 
          onClick={onNewChat}
          className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-700 active:scale-95"
          title="New Message"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Messenger"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
        </div>
      </div>

      {/* Stories - Simplified for now to just show user's story add */}
      <div className="px-4 py-2 flex space-x-4 overflow-x-auto no-scrollbar pb-4 border-b border-gray-50">
        <div className="flex flex-col items-center space-y-1 min-w-[60px]">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors">
            <PlusIcon className="w-6 h-6 text-gray-400" />
          </div>
          <span className="text-xs text-gray-500 font-medium">Your Story</span>
        </div>
        {/* We can re-enable story bubbles if we add a story feature later */}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {sortedConversations.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-48 text-gray-400 px-6 text-center">
             <p className="text-sm">No conversations yet.</p>
             <button onClick={onNewChat} className="text-primary-500 font-semibold text-sm mt-2 hover:underline">Start a chat</button>
           </div>
        ) : (
          sortedConversations.map((conv) => {
            const otherUser = conv.participants.find(p => p.id !== currentUser.id);
            const isActive = activeConversationId === conv.id;
            
            if (!otherUser) return null;

            return (
              <div 
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`px-4 py-3 flex items-center space-x-3 cursor-pointer transition-colors ${
                  isActive ? 'bg-primary-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img 
                    src={otherUser.avatar} 
                    alt={otherUser.name} 
                    className="w-12 h-12 rounded-full object-cover border border-gray-100"
                  />
                  {otherUser.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`text-sm font-semibold truncate ${isActive ? 'text-gray-900' : 'text-gray-800'}`}>
                      {otherUser.name}
                    </h3>
                    {conv.lastMessage && (
                      <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? 'text-primary-600 font-bold' : 'text-gray-400'}`}>
                        {new Date(conv.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate pr-2 ${
                      conv.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'
                    }`}>
                      {conv.isTyping ? (
                        <span className="text-primary-500 font-medium italic">Typing...</span>
                      ) : (
                        conv.lastMessage ? (
                          <>
                            {conv.lastMessage.senderId === currentUser.id && "You: "}
                            {conv.lastMessage.text}
                          </>
                        ) : <span className="text-gray-400 italic">Say hi!</span>
                      )}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;