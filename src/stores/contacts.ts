import { ref } from "vue";
import { defineStore } from "pinia";

import { bzr } from "@/bazaar";
import { arrayMirrorSubscribeListener, type Contact } from "@bzr/bazaar";

export const useContactsStore = defineStore("contacts", () => {
  const contacts = ref([] as Contact[]);

  async function sync(): Promise<void> {
    await bzr.social.contacts.subscribe(
      arrayMirrorSubscribeListener(contacts.value),
    );
  }

  return {
    contacts,
    sync,
  };
});
