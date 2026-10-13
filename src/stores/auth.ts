import { ref } from "vue";
import { defineStore } from "pinia";

import { bzr } from "@/bazaar";
import { useUsersStore } from "./users";
import { useContactsStore } from "./contacts";
import { useIndividualChatsStore } from "./individualChats";

export const useAuthStore = defineStore("auth", () => {
  // True while a stored token is being used to connect and load chats.
  const loading = ref(bzr.isLoggedIn());
  const authenticated = ref(false);

  async function autoSignIn() {
    if (!bzr.isLoggedIn()) {
      loading.value = false;
      return;
    }
    loading.value = true;
    try {
      const usersStore = useUsersStore();
      await usersStore.getUser();

      const contactsStore = useContactsStore();
      await contactsStore.sync();

      const individualChatsStore = useIndividualChatsStore();
      await individualChatsStore.sync();

      authenticated.value = true;
    } catch (e: unknown) {
      console.error("Error during auto signin", e);
    } finally {
      loading.value = false;
    }
  }

  function logOut() {
    // Clears the token and reloads the page.
    bzr.logOut();
  }

  return { loading, authenticated, autoSignIn, logOut };
});
