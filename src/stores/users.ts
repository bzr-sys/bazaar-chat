import { ref } from "vue";
import { defineStore } from "pinia";

import { bzr, mirrorAll } from "@/bazaar";
import type { User } from "@bzr/bazaar";

// const PUBLIC_BLOGS_COLLECTION_NAME = "public_blogs";
// const PRIVATE_BLOGS_COLLECTION_NAME = "private_blogs";
// // const GROUP_CHATS_COLLECTION_NAME = "group_chats";
// const INDIVIDUAL_CHATS_COLLECTION_NAME = "individual_chats";

export const useUsersStore = defineStore("users", () => {
  const user = ref({
    id: "",
    email: "",
    name: "",
  } as User);
  const userData = ref({} as { [key: string]: any });
  // const userUnsubscribe = {} as { [key: string]: any };

  async function getUser() {
    user.value = await bzr.social.getUser();
  }

  // async function fetchUserData(userId: string): Promise<void> {
  //   console.log("fetch user data", userId);

  //   if (userUnsubscribe[userId]) {
  //     console.log("cannot fetch if subscribed");
  //     return;
  //   }

  //   userUnsubscribe[userId] = {};
  //   userData.value[userId] = {};

  //   const publicBlogC = bzr.collection(PUBLIC_BLOGS_COLLECTION_NAME, {
  //     userId: userId,
  //   });
  //   userData.value[userId][PUBLIC_BLOGS_COLLECTION_NAME] = [];
  //   userUnsubscribe[userId][PUBLIC_BLOGS_COLLECTION_NAME] = await mirrorAll(
  //     {},
  //     publicBlogC,
  //     userData.value[userId][PUBLIC_BLOGS_COLLECTION_NAME],
  //     { onAdd: async (d) => console.log(d) }
  //   );
  //   console.log(userData.value[userId][PUBLIC_BLOGS_COLLECTION_NAME]);

  //   const privateBlogC = bzr.collection(PRIVATE_BLOGS_COLLECTION_NAME, {
  //     userId: userId,
  //   });
  //   userData.value[userId][PRIVATE_BLOGS_COLLECTION_NAME] = [];
  //   userUnsubscribe[userId][PRIVATE_BLOGS_COLLECTION_NAME] = await mirrorAll(
  //     {},
  //     privateBlogC,
  //     userData.value[userId][PRIVATE_BLOGS_COLLECTION_NAME]
  //   );

  //   // Fetch messages
  //   const individualChatsC = bzr.collection(INDIVIDUAL_CHATS_COLLECTION_NAME, {
  //     userId: userId,
  //   });
  //   userData.value[userId][INDIVIDUAL_CHATS_COLLECTION_NAME] = [];
  //   userUnsubscribe[userId][INDIVIDUAL_CHATS_COLLECTION_NAME] = await mirrorAll(
  //     {},
  //     individualChatsC,
  //     userData.value[userId][INDIVIDUAL_CHATS_COLLECTION_NAME]
  //   );
  // }

  return {
    // state
    user,
    userData,

    // actions
    getUser,
    // fetchUserData,
  };
});
