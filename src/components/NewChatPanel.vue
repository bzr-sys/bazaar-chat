<script setup lang="ts">
import { computed } from "vue";
import type { Contact } from "@bzr/bazaar";

import UserAvatar from "@/components/UserAvatar.vue";
import { useContactsStore } from "@/stores/contacts";
import { useIndividualChatsStore } from "@/stores/individualChats";

const emit = defineEmits<{
  open: [userId: string];
  find: [];
  close: [];
}>();

const contactsStore = useContactsStore();
const chatsStore = useIndividualChatsStore();

const chatlessContacts = computed(() =>
  contactsStore.contacts.filter((c: Contact) => !chatsStore.myChats[c.user.id]),
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 bg-bzr-side p-4 md:p-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">New chat</h2>
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-bzr border border-[#3a3a3a] hover:bg-bzr-hover"
        aria-label="Close"
        @click="emit('close')"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>

    <button
      type="button"
      class="flex min-h-12 items-center gap-2.5 rounded-bzr border border-bzr-edge bg-[#2a2a2a] px-3.5 py-2 text-left hover:border-bzr-primary md:max-w-md"
      @click="emit('find')"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#db9a59"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <span class="flex flex-col">
        <span class="font-semibold">Find someone on Bazaar</span>
        <span class="text-xs text-bzr-muted"
          >Search by handle or email, then Select</span
        >
      </span>
    </button>

    <span
      class="pt-1.5 text-xs font-semibold uppercase tracking-wider text-bzr-muted"
      >Your contacts</span
    >
    <div
      v-if="chatlessContacts.length > 0"
      class="flex flex-col gap-2 md:max-w-md"
    >
      <div
        v-for="c in chatlessContacts"
        :key="c.id"
        class="flex items-center gap-3"
      >
        <UserAvatar :user-id="c.user.id" :name="c.user.name" :size="36" />
        <span class="flex-1">{{ c.user.name }}</span>
        <button
          type="button"
          class="h-9 rounded-bzr border border-bzr-primary-edge px-2.5 text-[13px] font-semibold text-bzr-gold hover:bg-bzr-primary-tint"
          @click="emit('open', c.user.id)"
        >
          Message
        </button>
      </div>
    </div>
    <div v-else class="text-bzr-muted">
      Contacts you add in the Bazaar window show up here.
    </div>

    <div class="mt-auto text-[13px] leading-snug text-bzr-muted">
      After Select in the Bazaar window, the chat opens here with the composer
      focused.
    </div>
  </div>
</template>
