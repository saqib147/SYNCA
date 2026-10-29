import { Message } from '@synca/types';

export interface GroupedMessageItem {
  message: Message;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showDateDivider: boolean;
  dateLabel: string;
}

export function groupMessages(messages: Message[], currentUserId?: string): GroupedMessageItem[] {
  return messages.map((msg, index) => {
    const prev = messages[index - 1];
    const next = messages[index + 1];

    const isOwn = Boolean(currentUserId && msg.senderId === currentUserId);
    const msgDate = new Date(msg.createdAt);

    // Date divider calculation
    let showDateDivider = false;
    let dateLabel = '';
    if (!prev) {
      showDateDivider = true;
    } else {
      const prevDate = new Date(prev.createdAt);
      if (msgDate.toDateString() !== prevDate.toDateString()) {
        showDateDivider = true;
      }
    }

    if (showDateDivider) {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (msgDate.toDateString() === today.toDateString()) {
        dateLabel = 'Today';
      } else if (msgDate.toDateString() === yesterday.toDateString()) {
        dateLabel = 'Yesterday';
      } else {
        dateLabel = msgDate.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }
    }

    // Check if same sender and within 5 minutes of previous message
    let isFirstInGroup = true;
    if (prev && !showDateDivider) {
      const prevDate = new Date(prev.createdAt);
      const diffMs = msgDate.getTime() - prevDate.getTime();
      const sameSender = prev.senderId === msg.senderId;
      if (sameSender && diffMs < 5 * 60 * 1000) {
        isFirstInGroup = false;
      }
    }

    // Check if same sender and within 5 minutes of next message
    let isLastInGroup = true;
    if (next) {
      const nextDate = new Date(next.createdAt);
      const isNextNewDay = nextDate.toDateString() !== msgDate.toDateString();
      const diffMs = nextDate.getTime() - msgDate.getTime();
      const sameSender = next.senderId === msg.senderId;
      if (sameSender && !isNextNewDay && diffMs < 5 * 60 * 1000) {
        isLastInGroup = false;
      }
    }

    return {
      message: msg,
      isOwn,
      isFirstInGroup,
      isLastInGroup,
      showDateDivider,
      dateLabel,
    };
  });
}

