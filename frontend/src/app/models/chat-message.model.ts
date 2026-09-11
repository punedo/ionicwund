export interface ChatMessage {
  id: number;
  patientId: number;
  senderId: number;
  senderName: string;
  senderInitials: string;
  senderRole: string;
  recipientId: number | null;
  recipientName: string;
  recipientRole: string;
  content: string;
  createdAt: string;
  createdAtLabel: string;
  isOwn: boolean;
}

export interface ChatRecipient {
  id: number;
  fullName: string;
  role: string;
}
