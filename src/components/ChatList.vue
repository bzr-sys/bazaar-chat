<script setup lang="ts">
import { computed, watchEffect } from "vue";
import type { Contact } from "@bzr/bazaar";

import AccountMenu from "@/components/AccountMenu.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { useContactsStore } from "@/stores/contacts";
import { useIndividualChatsStore, type Chat } from "@/stores/individualChats";
import { useUsersStore } from "@/stores/users";
import { listTime, now } from "@/utils/time";

const emit = defineEmits<{
  open: [userId: string];
  newChat: [];
  find: [];
}>();

const contactsStore = useContactsStore();
const chatsStore = useIndividualChatsStore();
const usersStore = useUsersStore();

const chatlessContacts = computed(() =>
  contactsStore.contacts.filter((c: Contact) => !chatsStore.myChats[c.user.id]),
);

// Handles are shown under names; fetch each profile once.
watchEffect(() => {
  for (const c of chatsStore.sortedChats) {
    usersStore.getProfile(c.id).catch(() => {});
  }
});

function subtitle(c: Chat): string {
  if (c.unread) {
    return chatsStore.incomingChats[c.id] ? "New chat" : "New message";
  }
  if (chatsStore.peerStatus[c.id] === "not-app-user") {
    return "Not on Bazaar Chat yet";
  }
  const handle = usersStore.profiles[c.id]?.handle;
  return handle ? `@${handle}` : "";
}
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <div class="flex items-center justify-between px-4 pb-3 pt-4 md:pt-4">
      <h2 class="text-[26px] font-bold md:text-xl">Chats</h2>
      <button
        type="button"
        class="hidden h-9 items-center gap-1.5 rounded-bzr bg-bzr-primary px-3 font-semibold text-bzr-bg hover:bg-bzr-gold md:flex"
        @click="emit('newChat')"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        New chat
      </button>
      <AccountMenu class="md:hidden" compact />
    </div>

    <!-- S3: no chats yet -->
    <div
      v-if="chatsStore.sortedChats.length === 0"
      class="flex flex-1 flex-col gap-3.5 px-4 pb-4"
    >
      <div
        class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#db9a59"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        </svg>
        <div class="text-lg font-bold">No chats yet</div>
        <div class="text-bzr-soft">
          Start a conversation with anyone on Bazaar.
        </div>
        <button
          type="button"
          class="h-11 rounded-bzr bg-bzr-primary px-[18px] font-bold text-bzr-bg hover:bg-bzr-gold"
          @click="emit('find')"
        >
          Find someone
        </button>
      </div>
      <div
        v-if="chatlessContacts.length > 0"
        class="flex flex-col gap-1 border-t border-bzr-line pt-3"
      >
        <span
          class="pb-1 text-xs font-semibold uppercase tracking-wider text-bzr-muted"
          >Or message a contact</span
        >
        <button
          v-for="c in chatlessContacts"
          :key="c.id"
          type="button"
          class="py-1 text-left text-[#d4d4d4] hover:text-bzr-gold"
          @click="emit('open', c.user.id)"
        >
          {{ c.user.name }}
        </button>
      </div>
    </div>

    <!-- Chats, newest first -->
    <div
      v-else
      class="flex min-h-0 flex-1 flex-col overflow-y-auto pb-24 md:pb-4"
    >
      <button
        v-for="c in chatsStore.sortedChats"
        :key="c.id"
        type="button"
        class="flex min-h-16 items-center gap-3 px-4 py-3 text-left hover:bg-bzr-hover"
        :class="c.id === chatsStore.activeChatId ? 'md:bg-bzr-hover' : ''"
        :aria-current="c.id === chatsStore.activeChatId ? 'true' : undefined"
        @click="emit('open', c.id)"
      >
        <UserAvatar :user-id="c.id" :name="c.name" :size="44" />
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="flex justify-between gap-2">
            <span
              class="truncate"
              :class="c.unread ? 'font-bold' : 'font-medium'"
              >{{ c.name || c.id }}</span
            >
            <span
              class="flex-none text-[13px]"
              :class="c.unread ? 'text-bzr-gold' : 'text-bzr-muted'"
              >{{ listTime(c.lastMessage, now) }}</span
            >
          </span>
          <span class="flex items-center justify-between gap-2">
            <span
              class="truncate text-[13px]"
              :class="c.unread ? 'text-bzr-gold' : 'text-bzr-muted'"
              >{{ subtitle(c) }}</span
            >
            <span
              v-if="c.unread"
              class="h-2.5 w-2.5 flex-none rounded-full bg-bzr-primary"
            >
              <span class="sr-only">Unread</span>
            </span>
          </span>
        </span>
      </button>

      <template v-if="chatlessContacts.length > 0">
        <div
          class="px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-bzr-muted"
        >
          Contacts · start a chat
        </div>
        <button
          v-for="c in chatlessContacts"
          :key="c.id"
          type="button"
          class="flex items-center gap-3 px-4 py-2 text-left text-[#d4d4d4] hover:bg-bzr-hover"
          @click="emit('open', c.user.id)"
        >
          <UserAvatar
            :user-id="c.user.id"
            :name="c.user.name"
            :size="32"
            dashed
          />
          <span>{{ c.user.name }}</span>
        </button>
      </template>
    </div>

    <!-- Mobile: floating New chat -->
    <button
      type="button"
      class="absolute bottom-7 right-5 flex h-14 items-center gap-2 rounded-bzr bg-bzr-primary px-5 text-base font-bold text-bzr-bg shadow-lg md:hidden"
      @click="emit('newChat')"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      New chat
    </button>
  </div>
</template>
