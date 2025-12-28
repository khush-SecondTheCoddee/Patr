import { GoogleGenAI } from "@google/genai";
import { Message, User } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We map the internal message structure to the Gemini Chat history format
const formatHistory = (messages: Message[], currentUserId: string) => {
  return messages.map((msg) => ({
    role: msg.senderId === currentUserId ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));
};

export const generateReply = async (
  conversationId: string,
  history: Message[],
  lastUserMessage: string,
  personaPrompt: string,
  currentUserId: string
): Promise<string> => {
  try {
    const modelId = "gemini-3-flash-preview";
    
    // Create a chat session with the specific persona instructions
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: `You are a user on a chat app called Patr. 
        Your persona description: ${personaPrompt}. 
        Keep your responses concise, informal, and appropriate for an instant messenger (like Instagram DMs). 
        Use standard internet slang or emojis if it fits the persona. 
        Do not be overly helpful like an AI assistant; be a friend/contact.
        Max length: 2-3 sentences mostly.`,
        temperature: 0.9,
      },
      history: formatHistory(history, currentUserId),
    });

    const result = await chat.sendMessage({ message: lastUserMessage });
    return result.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I can't reply right now. (Network Error)";
  }
};