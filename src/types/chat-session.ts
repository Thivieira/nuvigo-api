export type ChatSessionUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: string;
};

export type ChatSessionChat = {
  id: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  chatSessionId: string;
  message: string;
  role: string;
  turn: number;
  metadata: any;
};

export type ChatSession = {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: ChatSessionUser;
  chats: ChatSessionChat[];
}; 