import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getAllUsers } from '../services/firebaseService';
import { SearchIcon } from './Icons';

interface NewChatModalProps {
  currentUser: User;
  onClose: () => void;
  onStartChat: (user: User) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ currentUser, onClose, onStartChat }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load users from storage, exclude self
    const fetchUsers = async () => {
      const allUsers = await getAllUsers();
      setUsers(allUsers.filter(u => u.id !== currentUser.id));
      setLoading(false);
    };
    fetchUsers();
  }, [currentUser.id]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md h-[500px] flex flex-col shadow-2xl animate-fadeUp">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold">New Message</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-4">
           <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                autoFocus
                placeholder="Search users..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {loading ? (
             <div className="flex justify-center mt-10">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
               <p>No users found.</p>
               <p className="text-xs mt-2">Make sure other users have signed up!</p>
            </div>
          ) : (
            filteredUsers.map(user => (
              <div 
                key={user.id} 
                onClick={() => onStartChat(user)}
                className="flex items-center p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
              >
                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-gray-100" />
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;