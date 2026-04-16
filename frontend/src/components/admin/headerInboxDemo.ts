export type InboxItem = {
  id: string;
  title: string;
  body: string;
  /** Short relative label, e.g. "2m ago" */
  time: string;
  read: boolean;
};

export const seedNotifications: InboxItem[] = [];

export const seedMessages: InboxItem[] = [];

export function cloneInboxItems(items: InboxItem[]): InboxItem[] {
  return items.map((i) => ({ ...i }));
}
