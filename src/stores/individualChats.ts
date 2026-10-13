import { ref, computed, type Ref } from "vue";
import { defineStore } from "pinia";

import { bzr } from "@/bazaar";
import {
  CollectionAPI,
  PermissionType,
  type Doc,
  type GrantedPermission,
  isNoAppUserError,
  isNoPermissionError,
  arrayMirrorSubscribeListener,
  GranteeType,
} from "@bzr/bazaar";

import { useUsersStore } from "./users";

const INDIVIDUAL_CHATS_COLLECTION_NAME = "individual_chats";
const MESSAGE_COLLECTION_PREFIX = "message_";

export type Chat = Doc & {
  name: string;
  lastMessage: Date;
  unread: boolean;
};
export type ChatMessage = Doc & {
  text: string;
  ts: Date;
};

export type UserChatMessage = ChatMessage & {
  userId: string;
};

/**
 * Whether the other person's messages can be read:
 * - pending: they have not opened the chat yet, so their message collection does not exist
 * - not-app-user: they have a Bazaar account but have never used Bazaar Chat
 */
export type PeerStatus =
  | "loading"
  | "ok"
  | "pending"
  | "not-app-user"
  | "error";

/** A message of mine that is still being sent, or could not be sent. */
export type OutgoingMessage = {
  id: string;
  text: string;
  ts: Date;
};

function toTime(d: Date | string | undefined): number {
  return d ? new Date(d).getTime() : 0;
}

export const useIndividualChatsStore = defineStore("individualChats", () => {
  const usersStore = useUsersStore();

  // The chat that is open on screen. Messages arriving there are read right away.
  const activeChatId = ref(undefined as undefined | string);
  const peerStatus = ref({} as { [userId: string]: PeerStatus });
  // Chats the other person started during this session (shown as "New chat").
  const incomingChats = ref({} as { [userId: string]: boolean });
  const sendingMessages = ref({} as { [userId: string]: OutgoingMessage[] });
  const failedMessages = ref({} as { [userId: string]: OutgoingMessage[] });

  // individual chats
  const individualChats: Ref<Chat[]> = ref([]);
  const individualChatsC = bzr.collection<Chat>(
    INDIVIDUAL_CHATS_COLLECTION_NAME,
    {
      onCreate: async () => {
        await bzr.permissions.create({
          collectionName: INDIVIDUAL_CHATS_COLLECTION_NAME,
          granteeType: GranteeType.ANY,
          types: [PermissionType.READ],
          filter: {
            id: "$user",
          },
        });
      },
    },
  );
  let individualChatsU = undefined as (() => Promise<string>) | undefined;

  const myChats = computed(() => {
    const map = {} as { [userId: string]: Chat };
    for (const c of individualChats.value) {
      map[c.id] = c;
    }
    return map;
  });

  const sortedChats = computed(() => {
    return individualChats.value
      .slice()
      .sort((a, b) => toTime(b.lastMessage) - toTime(a.lastMessage));
  });

  const otherChatsCollections = {} as {
    [key: string]: CollectionAPI<Chat>;
  };
  const otherChatsUnsubscribe = {} as {
    [key: string]: () => Promise<string>;
  };
  // The other person's chat entry about me. Its lastMessage is when they last wrote.
  const otherChats = ref({} as { [userId: string]: Chat });
  const insertingChats = {} as { [userId: string]: boolean };

  /**
   * Marks a chat as read. Moving lastMessage up to the other person's latest
   * message keeps the chat from turning unread again on the next load.
   */
  async function markRead(userId: string) {
    const mine = myChats.value[userId];
    if (!mine) {
      return;
    }
    const latest = Math.max(
      toTime(mine.lastMessage),
      toTime(otherChats.value[userId]?.lastMessage),
    );
    if (mine.unread || latest > toTime(mine.lastMessage)) {
      await individualChatsC.updateOne(userId, {
        lastMessage: new Date(latest),
        unread: false,
      });
    }
  }

  async function updateFromOtherChat(ownerId: string, chat: Chat) {
    otherChats.value[ownerId] = chat;

    const mine = myChats.value[ownerId];
    if (mine) {
      if (toTime(chat.lastMessage) > toTime(mine.lastMessage)) {
        if (activeChatId.value === ownerId) {
          await markRead(ownerId);
        } else {
          await individualChatsC.updateOne(ownerId, {
            lastMessage: chat.lastMessage,
            unread: true,
          });
        }
      }
    } else if (!insertingChats[ownerId]) {
      // The other person started this chat.
      insertingChats[ownerId] = true;
      try {
        const owner = await usersStore.getProfile(ownerId);
        incomingChats.value[ownerId] = true;
        await individualChatsC.insertOne({
          id: ownerId,
          name: owner.name,
          lastMessage: chat.lastMessage,
          unread: activeChatId.value !== ownerId,
        });
      } finally {
        delete insertingChats[ownerId];
      }
    }

    // Their side may have become readable (they opened the chat).
    if (myMessagesUnsubscribe[ownerId]) {
      await loadOtherMessages(ownerId);
    }
  }

  async function sync(): Promise<void> {
    if (!individualChatsU) {
      individualChats.value = [];
      individualChatsU = await individualChatsC.subscribeAll(
        {},
        arrayMirrorSubscribeListener(individualChats.value),
      );
    }

    const addOtherChat = async function (g: GrantedPermission) {
      if (!g.permission.collectionName.startsWith(MESSAGE_COLLECTION_PREFIX)) {
        return;
      }
      if (otherChatsUnsubscribe[g.ownerId]) {
        return;
      }
      const ctx = await bzr.createContext({ ownerId: g.ownerId });
      const c = ctx.collection<Chat>(INDIVIDUAL_CHATS_COLLECTION_NAME);
      otherChatsCollections[g.ownerId] = c;

      const update = (chat: Chat) => updateFromOtherChat(g.ownerId, chat);
      otherChatsUnsubscribe[g.ownerId] = await c.subscribeOne(
        usersStore.user.id,
        {
          onInitial: update,
          onAdd: update,
          onChange: (_oldChat, newChat) => update(newChat),
        },
      );
    };

    await bzr.permissions.granted.subscribe(
      {},
      {
        onInitial: addOtherChat,
        onAdd: addOtherChat,
        onChange: (_oldGranted, newGranted) => addOtherChat(newGranted),
      },
    );
  }

  const myMessagesCollections = {} as {
    [key: string]: CollectionAPI<ChatMessage>;
  };
  const myMessagesUnsubscribe = {} as {
    [key: string]: () => Promise<string>;
  };
  const myMessages = ref({} as { [key: string]: ChatMessage[] });

  const otherMessagesUnsubscribe = {} as {
    [key: string]: () => Promise<string>;
  };
  const otherMessagesRequests = {} as { [key: string]: Promise<void> };
  const otherMessages = ref({} as { [key: string]: ChatMessage[] });

  async function loadOtherMessages(userId: string): Promise<void> {
    if (otherMessagesUnsubscribe[userId]) {
      return;
    }
    if (!otherMessagesRequests[userId]) {
      otherMessagesRequests[userId] = subscribeOtherMessages(userId).finally(
        () => {
          delete otherMessagesRequests[userId];
        },
      );
    }
    return otherMessagesRequests[userId];
  }

  async function subscribeOtherMessages(userId: string): Promise<void> {
    if (!peerStatus.value[userId] || peerStatus.value[userId] === "error") {
      peerStatus.value[userId] = "loading";
    }
    try {
      const ctx = await bzr.createContext({ ownerId: userId });
      const c = ctx.collection<ChatMessage>(
        MESSAGE_COLLECTION_PREFIX + usersStore.user.id,
      );
      otherMessages.value[userId] = [];
      otherMessagesUnsubscribe[userId] = await c.subscribeAll(
        {},
        arrayMirrorSubscribeListener(otherMessages.value[userId]),
      );
      peerStatus.value[userId] = "ok";
    } catch (e) {
      if (isNoAppUserError(e)) {
        peerStatus.value[userId] = "not-app-user";
      } else if (isNoPermissionError(e)) {
        peerStatus.value[userId] = "pending";
      } else {
        console.error("Cannot read messages from", userId, e);
        peerStatus.value[userId] = "error";
      }
    }
  }

  /**
   * Opens a chat: creates it if needed, marks it read and subscribes to both sides.
   */
  async function loadChat(userId: string) {
    activeChatId.value = userId;
    try {
      const user = await usersStore.getProfile(userId);
      if (myChats.value[userId]) {
        if (myChats.value[userId].name !== user.name) {
          await individualChatsC.updateOne(userId, { name: user.name });
        }
        await markRead(userId);
      } else {
        await individualChatsC.insertOne({
          id: userId,
          name: user.name,
          lastMessage: new Date(),
          unread: false,
        });
      }

      // TODO add collection on first message. This way the other user does not get a chats entry (sharing) until a message is actually sent.

      // Add collection
      if (!(userId in myMessagesCollections)) {
        myMessagesCollections[userId] = bzr.collection<ChatMessage>(
          MESSAGE_COLLECTION_PREFIX + userId,
          {
            onCreate: async () => {
              await bzr.permissions.create({
                collectionName: MESSAGE_COLLECTION_PREFIX + userId,
                granteeType: GranteeType.USER,
                granteeId: userId,
                types: [PermissionType.READ],
              });
              return;
            },
          },
        );
      }

      if (!myMessagesUnsubscribe[userId]) {
        myMessages.value[userId] = [];
        myMessagesUnsubscribe[userId] = await myMessagesCollections[
          userId
        ].subscribeAll(
          {},
          arrayMirrorSubscribeListener(myMessages.value[userId]),
        );
      }

      await loadOtherMessages(userId);
    } catch (err) {
      console.error("Cannot load chat:", err);
      peerStatus.value[userId] = "error";
    }
  }

  function closeChat() {
    activeChatId.value = undefined;
  }

  async function postMessage(userId: string, message: string) {
    if (!message.trim()) {
      return false;
    }
    try {
      if (!(userId in myMessagesCollections)) {
        await loadChat(userId);
      }
      const ts = new Date();
      await myMessagesCollections[userId].insertOne({ text: message, ts: ts });

      await individualChatsC.updateOne(userId, {
        lastMessage: ts,
        unread: false,
      });
      return true;
    } catch (err) {
      console.error("Cannot post message:", err);
      return false;
    }
  }

  /**
   * Sends a message. It shows as "Sending…" until the server confirms it (while
   * offline the SDK queues it). If sending fails, it is kept so it can be retried.
   */
  async function sendMessage(userId: string, message: string) {
    const text = message.trim();
    if (!text) {
      return;
    }
    const outgoing = { id: crypto.randomUUID(), text: text, ts: new Date() };
    sendingMessages.value[userId] = [
      ...(sendingMessages.value[userId] ?? []),
      outgoing,
    ];
    const sent = await postMessage(userId, text);
    sendingMessages.value[userId] = (
      sendingMessages.value[userId] ?? []
    ).filter((m) => m.id !== outgoing.id);
    if (!sent) {
      failedMessages.value[userId] = [
        ...(failedMessages.value[userId] ?? []),
        outgoing,
      ];
    }
  }

  async function retryMessage(userId: string, id: string) {
    const failed = failedMessages.value[userId] ?? [];
    const message = failed.find((m) => m.id === id);
    if (!message) {
      return;
    }
    failedMessages.value[userId] = failed.filter((m) => m.id !== id);
    await sendMessage(userId, message.text);
  }

  const chatMessages = computed(() => {
    return (userId: string) => {
      const messages: UserChatMessage[] = [];
      if (myMessages.value[userId]) {
        messages.push(
          ...myMessages.value[userId].map((m) => {
            return { ...m, userId: usersStore.user.id };
          }),
        );
      }
      if (otherMessages.value[userId]) {
        messages.push(
          ...otherMessages.value[userId].map((m) => {
            return { ...m, userId: userId };
          }),
        );
      }
      messages.sort((a, b) => toTime(a.ts) - toTime(b.ts));
      return messages;
    };
  });

  return {
    // state
    activeChatId,
    peerStatus,
    incomingChats,
    sendingMessages,
    failedMessages,

    // getter
    myChats,
    sortedChats,
    // getters with parameter
    chatMessages,

    // actions
    sync,
    loadChat,
    closeChat,
    loadOtherMessages,
    sendMessage,
    retryMessage,
  };
});
