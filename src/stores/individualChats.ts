import { ref, computed, type Ref } from "vue";
import { defineStore } from "pinia";

import { bzr, mirrorAll } from "@/bazaar";
import {
  CollectionAPI,
  PermissionType,
  type Doc,
  type GrantedPermission,
  type BazaarMessage,
  isNoAppUserError,
  isNoPermissionError,
} from "@bzr/bazaar";

import { useUsersStore } from "./users";

const INDIVIDUAL_CHATS_COLLECTION_NAME = "individual_chats";
const MESSAGE_COLLECTION_PREFIX = "message_";

export type Chat = Doc & {
  name: string;
  lastMessage: Date;
  unread: Boolean;
};
export type ChatMessage = Doc & {
  text: string;
  ts: Date;
};

export type UserChatMessage = ChatMessage & {
  userId: string;
};

export const useIndividualChatsStore = defineStore("individualChats", () => {
  const usersStore = useUsersStore();

  // individual chats
  const individualChats: Ref<Chat[]> = ref([]);
  const individualChatsC = bzr.collection<Chat>(
    INDIVIDUAL_CHATS_COLLECTION_NAME,
    {
      onCreate: async () => {
        await bzr.permissions.create({
          collectionName: INDIVIDUAL_CHATS_COLLECTION_NAME,
          userId: "*",
          types: [PermissionType.READ],
          filter: {
            id: "$user",
          },
        });
      },
    },
  );
  let individualChatsU = undefined as
    | (() => Promise<BazaarMessage>)
    | undefined;

  const myChats = computed(() => {
    const map = {} as { [userId: string]: Chat };
    for (const c of individualChats.value) {
      map[c.id] = c;
    }
    return map;
  });

  const sortedChats = computed(() => {
    // TODO use toSorted
    return individualChats.value.sort((a, b) => {
      return (
        new Date(b.lastMessage).getTime() - new Date(a.lastMessage).getTime()
      );
    });
  });

  const otherChatsCollections = {} as { [key: string]: CollectionAPI };
  const otherChatsUnsubscribe = {} as {
    [key: string]: () => Promise<BazaarMessage>;
  };
  const otherChats = ref({} as { [userId: string]: Chat });

  async function sync(): Promise<void> {
    if (!individualChatsU) {
      individualChats.value = [];
      individualChatsU = await mirrorAll(
        {},
        individualChatsC,
        individualChats.value,
      ); // TODO: fetch messages
    }

    const addOtherChat = async function (g: GrantedPermission) {
      console.log("add other chat");
      console.log(g);
      if (g.permission.collectionName.startsWith(MESSAGE_COLLECTION_PREFIX)) {
        if (otherChatsUnsubscribe[g.ownerId]) {
          // should not happen, ignore
          console.log("repeat chat: should not happen");
          return;
        }
        const c = bzr.collection<Chat>(INDIVIDUAL_CHATS_COLLECTION_NAME, {
          userId: g.ownerId,
        });
        otherChatsCollections[g.ownerId] = c;
        otherChatsUnsubscribe[g.ownerId] = await c.subscribeOne(
          usersStore.user.id,
          async (changes) => {
            if (changes.newDoc) {
              otherChats.value[g.ownerId] = changes.newDoc;

              if (myChats.value[g.ownerId]) {
                if (
                  changes.newDoc.lastMessage >
                  myChats.value[g.ownerId].lastMessage
                ) {
                  individualChatsC.updateOne(g.ownerId, {
                    lastMessage: changes.newDoc.lastMessage,
                    unread: true,
                  });
                }
              } else {
                const owner = await bzr.social.getUser({ userId: g.ownerId });
                individualChatsC.insertOne({
                  id: g.ownerId,
                  name: owner.name,
                  lastMessage: new Date(),
                  unread: false,
                });
              }
              if (myMessagesUnsubscribe[g.ownerId]) {
                loadOtherMessages(g.ownerId);
              }
            }
          },
        );
        console.log("try to get chat");
        const chat = await c.getOne(usersStore.user.id);
        console.log(chat);
        if (chat) {
          otherChats.value[g.ownerId] = chat;
          if (myChats.value[g.ownerId]) {
            if (chat.lastMessage > myChats.value[g.ownerId].lastMessage) {
              individualChatsC.updateOne(g.ownerId, {
                lastMessage: chat.lastMessage,
                unread: true,
              });
            }
          } else {
            const owner = await bzr.social.getUser({ userId: g.ownerId });
            individualChatsC.insertOne({
              id: g.ownerId,
              name: owner.name,
              lastMessage: new Date(),
              unread: false,
            });
          }

          if (myMessagesUnsubscribe[g.ownerId]) {
            loadOtherMessages(g.ownerId);
          }
        }
      }
    };

    await bzr.permissions.granted.subscribe({}, (changes) => {
      if (changes.newDoc) {
        addOtherChat(changes.newDoc);
      }
    });
    const granted = await bzr.permissions.granted.list();
    for (const g of granted) {
      addOtherChat(g);
    }
  }

  const myMessagesCollections = {} as { [key: string]: CollectionAPI };
  const myMessagesUnsubscribe = {} as {
    [key: string]: () => Promise<BazaarMessage>;
  };
  const myMessages = ref({} as { [key: string]: ChatMessage[] });

  const otherMessagesCollections = {} as { [key: string]: CollectionAPI };
  const otherMessagesUnsubscribe = {} as {
    [key: string]: () => Promise<BazaarMessage>;
  };
  const otherMessages = ref({} as { [key: string]: ChatMessage[] });

  async function loadOtherMessages(userId: string) {
    if (otherMessagesUnsubscribe[userId]) {
      console.log("Already subscribed to messages from", userId);
      return;
    }

    otherMessagesCollections[userId] = bzr.collection(
      MESSAGE_COLLECTION_PREFIX + usersStore.user.id,
      {
        userId: userId,
      },
    );

    otherMessages.value[userId] = [];
    try {
      otherMessagesUnsubscribe[userId] = await mirrorAll(
        {},
        otherMessagesCollections[userId],
        otherMessages.value[userId],
      );
    } catch (e) {
      console.log("error when mirroring");
      console.log(e);
      let msg = "Cannot read messages from this user";
      if (isNoAppUserError(e)) {
        msg = "This user is not using Bazaar Chat";
      }
      if (isNoPermissionError(e)) {
        msg = "This user is not started chatting with you yet";
      }
      otherMessages.value[userId] = [
        {
          id: "-",
          text: msg,
          ts: new Date(),
        },
      ];
    }
  }

  async function loadChat(userId: string) {
    try {
      const user = await bzr.social.getUser({ userId: userId });
      if (myChats.value[userId]) {
        await individualChatsC.updateOne(userId, {
          name: user.name,
          unread: false,
        });
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
        myMessagesCollections[userId] = bzr.collection(
          MESSAGE_COLLECTION_PREFIX + userId,
          {
            onCreate: async () => {
              await bzr.permissions.create({
                collectionName: MESSAGE_COLLECTION_PREFIX + userId,
                userId: userId,
                types: [PermissionType.READ],
              });
              return;
            },
          },
        );
      }

      if (myMessagesUnsubscribe[userId]) {
        console.log("Already subscribed to chat with", userId);
        return;
      }

      myMessages.value[userId] = [];
      myMessagesUnsubscribe[userId] = await mirrorAll(
        {},
        myMessagesCollections[userId],
        myMessages.value[userId],
      );

      loadOtherMessages(userId);
    } catch (err) {
      console.log("Cannot load chat:", err);
    }
  }

  async function postMessage(userId: string, message: string) {
    console.log("post message for", userId);
    if (!(userId in myMessagesCollections)) {
      await loadChat(userId);
    }
    try {
      if (!message) {
        console.log("no text", message);
        return;
      }
      const ts = new Date();
      await myMessagesCollections[userId].insertOne({ text: message, ts: ts });

      await individualChatsC.updateOne(myChats.value[userId].id, {
        lastMessage: ts,
        unread: false,
      });
    } catch (err) {
      console.log("Cannot post message:", err);
    }
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
      messages.sort((a, b) => {
        return new Date(a.ts).getTime() - new Date(b.ts).getTime();
      });
      // console.log(messages);
      return messages;
    };
  });

  return {
    // getter
    myChats,
    sortedChats,
    // getters with parameter
    chatMessages,

    // actions
    sync,
    loadChat,
    postMessage,
  };
});
