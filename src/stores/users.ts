import { ref } from "vue";
import { defineStore } from "pinia";

import { bzr } from "@/bazaar";
import type { User } from "@bzr/bazaar";

export const useUsersStore = defineStore("users", () => {
  const user = ref({
    id: "",
    email: "",
    name: "",
    handle: "",
  } as User);

  // Profiles of other users (name, handle), fetched once per session.
  const profiles = ref({} as { [userId: string]: User });
  const profileRequests = {} as { [userId: string]: Promise<User> };

  async function getUser() {
    user.value = await bzr.social.getUser();
  }

  async function getProfile(userId: string): Promise<User> {
    if (profiles.value[userId]) {
      return profiles.value[userId];
    }
    if (!profileRequests[userId]) {
      profileRequests[userId] = bzr.social
        .getUser({ userId: userId })
        .then((u) => {
          profiles.value[userId] = u;
          return u;
        })
        .finally(() => {
          delete profileRequests[userId];
        });
    }
    return profileRequests[userId];
  }

  return {
    // state
    user,
    profiles,

    // actions
    getUser,
    getProfile,
  };
});
