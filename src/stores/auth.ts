import { ref } from "vue";
import { defineStore } from "pinia";

import { bzr } from "@/bazaar";
import { useUsersStore } from "./users";
import { useContactsStore } from "./contacts";
import { useIndividualChatsStore } from "./individualChats";

export const useAuthStore = defineStore("auth", () => {
  const loaded = ref(false);
  const authenticated = ref(false);

  async function autoSignIn() {
    console.log("autosignin:", bzr.isLoggedIn());
    if (bzr.isLoggedIn()) {
      try {
        const usersStore = useUsersStore();
        await usersStore.getUser();

        const contactsStore = useContactsStore();
        await contactsStore.sync();

        const individualChatsStore = useIndividualChatsStore();
        await individualChatsStore.sync();

        authenticated.value = true;
        loaded.value = true;

        // debug, TODO remove
        // bzr.permissions.list().then((p) => console.log("permissions", p));
      } catch (e: unknown) {
        console.error("Error during auto signin", e);
      }
    } else {
      loaded.value = true;
    }
  }

  return { loaded, authenticated, autoSignIn };
});
