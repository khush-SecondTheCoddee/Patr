import React, { useState } from 'react';
import { User } from '../types';
import { updateUserProfile } from '../services/firebaseService';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (user: User) => void;
  onLogout: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUpdate, onLogout }) => {
  const [about, setAbout] = useState(user.about || '');
  const [name, setName] = useState(user.name);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await updateUserProfile(user.id, { name, about });
    onUpdate({ ...user, name, about });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fadeUp">
        <div className="h-24 bg-gradient-to-r from-primary-400 to-purple-500 relative">
           <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-black/20 rounded-full text-white hover:bg-black/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
        <div className="px-6 pb-6 relative">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-white -mt-12 mb-4 mx-auto">
             <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Display Name</label>
              <input 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 focus:border-primary-500 outline-none font-semibold text-gray-800"
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Username</label>
              <p className="mt-1 p-2 text-gray-600 bg-gray-50 rounded-lg border border-gray-100">@{user.username}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">About</label>
              <textarea 
                value={about}
                onChange={e => setAbout(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 focus:border-primary-500 outline-none text-sm h-20 resize-none"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
               <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full py-2 bg-black text-white rounded-xl font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
               >
                 {loading ? 'Saving...' : 'Save Changes'}
               </button>
               <button 
                onClick={onLogout}
                className="w-full py-2 text-red-500 rounded-xl font-medium hover:bg-red-50 transition-colors"
               >
                 Log Out
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;