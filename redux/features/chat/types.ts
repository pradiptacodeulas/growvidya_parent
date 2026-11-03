export interface ChatNotificationBannerData {
  id: string | number;
  senderId: string | number;
  senderRole: string;
  senderName: string;
  senderPicture?: string | null;
  message: string;
  timestamp?: string;
}

export interface ChatContact {
  id: number;
  name: string;
  role: string;
  picture?: string | null;
  email?: string;
  phone?: string;
  code?: string;
  class_name?: string;
  section_name?: string;
  last_message?: string | null;
  last_message_time?: string | null;
  unread_count?: number;
  is_online?: boolean;
}

export interface ChatState {
  unreadCount: number;
  activeChatKey: string | null;
  lastReceivedMessage: any | null;
  notificationBanner: ChatNotificationBannerData | null;
  contacts: ChatContact[];
  isLoading: boolean;
  error: string | null;
}
