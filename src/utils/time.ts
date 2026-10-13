import { ref } from "vue";

/**
 * The current time, updated every 30 seconds so relative labels ("now") stay fresh.
 */
export const now = ref(Date.now());
setInterval(() => {
  now.value = Date.now();
}, 30 * 1000);

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysAgo(t: number, current: number): number {
  return Math.round((startOfDay(current) - startOfDay(t)) / DAY);
}

function clock(t: number): string {
  return new Date(t).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Time under a message: "now" or "21:17". */
export function messageTime(ts: Date | string, current: number): string {
  const t = new Date(ts).getTime();
  if (current - t < 60 * 1000) {
    return "now";
  }
  return clock(t);
}

/** Time in the chat list: "now", "21:17", "Yesterday", "Mon" or "Oct 3". */
export function listTime(ts: Date | string, current: number): string {
  const t = new Date(ts).getTime();
  if (current - t < 60 * 1000) {
    return "now";
  }
  const days = daysAgo(t, current);
  if (days <= 0) {
    return clock(t);
  }
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 7) {
    return new Date(t).toLocaleDateString([], { weekday: "short" });
  }
  return new Date(t).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

/** Day divider in a conversation: "Today", "Yesterday" or "Monday, Oct 5". */
export function dayLabel(ts: Date | string, current: number): string {
  const t = new Date(ts).getTime();
  const days = daysAgo(t, current);
  if (days <= 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  return new Date(t).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function dayKey(ts: Date | string): number {
  return startOfDay(new Date(ts).getTime());
}
