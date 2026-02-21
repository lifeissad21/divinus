export type UiTheme = "light" | "dark";

export type InboxProfile = {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
};

export type InboxMessage = {
  id: string;
  messageId: string;
  accountEmail: string;
  from: string;
  subject: string;
  date: string;
  preview: string;
};

export type MessageDetail = {
  id: string;
  messageId: string;
  accountEmail: string;
  from: string;
  subject: string;
  date: string;
  preview: string;
  bodyText: string;
  bodyHtml: string;
  body: string;
  error?: string;
};