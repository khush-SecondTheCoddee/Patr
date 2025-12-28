import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc,
  doc,
  getDoc,
  serverTimestamp,
  orderBy,
  getDocs,
  limit,
  updateDoc
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";
import { User, Conversation, Message } from "../types";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Helpers ---

// Since we promised username login, but Firebase uses Email, we append a domain.
const FAKE_DOMAIN = "@patr.app";
const getEmail = (username: string) => `${username.toLowerCase()}${FAKE_DOMAIN}`;
const getUsernameFromEmail = (email: string | null) => email ? email.split('@')[0] : '';

// Map Firestore doc to our App types
const mapUser = (doc: any): User => ({
  id: doc.id,
  ...doc.data(),
});

// --- Auth Services ---

export const loginWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const firebaseUser = result.user;

  // Check if user exists in Firestore
  try {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      // User exists, just update status
      await updateDoc(userDocRef, {
        isOnline: true,
        lastSeen: new Date().toISOString()
      });
      return { id: userDoc.id, ...userDoc.data() } as User;
    } else {
      // New User from Google
      const newUser: User = {
        id: firebaseUser.uid,
        username: firebaseUser.email?.split('@')[0] || 'user' + Math.floor(Math.random() * 1000),
        name: firebaseUser.displayName || 'Google User',
        avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
        about: "Hey there! I'm using Patr.",
        isOnline: true,
        lastSeen: new Date().toISOString()
      };
      
      await setDoc(userDocRef, newUser);
      return newUser;
    }
  } catch (e: any) {
    console.error("Google Login DB Error:", e);
    // Return partial user if DB fails so user isn't stuck
    if (e.code === 'not-found' || e.message.includes('not exist')) {
        // We throw specific error to UI to let them know setup is needed
        throw new Error("Firestore Database not found. Please create it in the Firebase Console.");
    }
    // Return basic user info so they can at least look around
    return {
        id: firebaseUser.uid,
        username: firebaseUser.email?.split('@')[0] || 'user',
        name: firebaseUser.displayName || 'User',
        avatar: firebaseUser.photoURL || '',
        isOnline: true
    };
  }
};

export const loginWithUsername = async (username: string, password: string): Promise<User> => {
  const email = getEmail(username);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // Update online status (Try/Catch in case DB is missing, we don't want to block login)
  try {
    await updateDoc(doc(db, "users", userCredential.user.uid), {
      isOnline: true,
      lastSeen: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Could not update online status (DB might be missing):", e);
  }

  return {
    id: userCredential.user.uid,
    username: username,
    name: userCredential.user.displayName || username,
    avatar: userCredential.user.photoURL || '',
    isOnline: true
  };
};

export const signupWithUsername = async (username: string, password: string, name: string): Promise<User> => {
  const email = getEmail(username);
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  await updateProfile(firebaseUser, {
    displayName: name,
    photoURL: avatarUrl
  });

  const newUser: User = {
    id: firebaseUser.uid,
    username: username,
    name: name,
    avatar: avatarUrl,
    about: "Hey there! I'm using Patr.",
    isOnline: true,
    lastSeen: new Date().toISOString()
  };

  // Create user document in Firestore
  try {
    await setDoc(doc(db, "users", firebaseUser.uid), newUser);
  } catch (e: any) {
    console.error("Failed to create user profile in DB:", e);
    // If DB is missing, we must throw because the app relies on this doc.
    if (e.code === 'not-found' || e.message.includes('not exist')) {
        throw new Error("Firestore Database not found. Please create it in the Firebase Console.");
    }
    throw e;
  }

  return newUser;
};

export const logoutUser = async (userId?: string) => {
  if (userId) {
    try {
        await updateDoc(doc(db, "users", userId), {
            isOnline: false,
            lastSeen: new Date().toISOString()
        });
    } catch(e) { console.error(e); }
  }
  await signOut(auth);
};

// --- Realtime Data Hooks (Listeners) ---

export const subscribeToConversations = (userId: string, callback: (conversations: Conversation[]) => void) => {
  const q = query(
    collection(db, "conversations"), 
    where("participantIds", "array-contains", userId),
    orderBy("lastMessageTimestamp", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const convs: Conversation[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        participants: data.participants, // Embedded user objects for simplified rendering
        lastMessage: data.lastMessage,
        unreadCount: 0, // Simplified for this demo
        type: data.type || 'private',
        personaPrompt: data.personaPrompt,
        participantIds: data.participantIds
      } as Conversation;
    });
    callback(convs);
  }, (error) => {
      console.error("Conversation subscription error:", error);
      callback([]); // Return empty list on error
  });
};

export const subscribeToMessages = (conversationId: string, callback: (messages: Message[]) => void) => {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Message));
    callback(messages);
  }, (error) => {
      console.error("Message subscription error:", error);
      callback([]);
  });
};

// --- Data Operations ---

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const q = query(collection(db, "users"), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapUser);
  } catch (e) {
    console.error("Error fetching users:", e);
    return [];
  }
};

export const updateUserProfile = async (userId: string, data: Partial<User>) => {
  await updateDoc(doc(db, "users", userId), data);
};

export const createNewConversation = async (currentUser: User, targetUser: User): Promise<string> => {
  // Check if exists
  // For simplicity in this demo, we won't strictly enforce single conversation per pair via query, 
  // but we can try to look it up if we had a composite key. 
  // We'll just create a new one or return existing if we find one in memory in the UI.
  
  const conversationData = {
    participantIds: [currentUser.id, targetUser.id],
    participants: [currentUser, targetUser],
    type: 'private',
    createdAt: serverTimestamp(),
    lastMessageTimestamp: Date.now()
  };

  const docRef = await addDoc(collection(db, "conversations"), conversationData);
  return docRef.id;
};

export const sendMessageToConversation = async (conversationId: string, message: Message) => {
  // 1. Add message to subcollection
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    ...message,
    timestamp: Date.now()
  });

  // 2. Update conversation last message
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: message,
    lastMessageTimestamp: Date.now()
  });
};