import { ref } from "vue";
import { defineStore } from "pinia";

import { bzr } from "@/bazaar";
import type { Contact } from "@bzr/bazaar";

export const useContactsStore = defineStore("contacts", () => {
  // contacts
  const contacts = ref([] as Contact[]);

  async function sync(): Promise<void> {
    bzr.social.contacts.list().then((cs) => {
      contacts.value = cs;
      bzr.social.contacts.subscribe((changes) => {
        if (!changes.oldDoc) {
          // New doc
          contacts.value.push(changes.newDoc as Contact);
          return;
        }
        if (!changes.newDoc) {
          // Deleted doc
          const idx = contacts.value.findIndex(
            (doc) => doc.id === changes.oldDoc!.id
          );
          if (idx > -1) {
            contacts.value.splice(idx, 1);
          }
          return;
        }
        // Changed doc
        const idx = contacts.value.findIndex(
          (doc) => doc.id === changes.newDoc!.id
        );
        contacts.value[idx] = changes.newDoc as Contact;
        return;
      });
    });
  }

  return {
    contacts,
    sync,
  };
});
