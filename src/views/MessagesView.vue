<script setup lang="ts">
import { computed, ref } from "vue";

import AccountMenu from "@/components/AccountMenu.vue";
import BazaarLogo from "@/components/BazaarLogo.vue";
import ChatList from "@/components/ChatList.vue";
import ConversationView from "@/components/ConversationView.vue";
import NewChatPanel from "@/components/NewChatPanel.vue";
import { useIndividualChatsStore } from "@/stores/individualChats";

import { bzr } from "@/bazaar";

const chatsStore = useIndividualChatsStore();

const newChat = ref(false);
const activeChatId = computed(() => chatsStore.activeChatId);
// On phones only one pane shows at a time.
const showDetail = computed(() => newChat.value || !!activeChatId.value);

async function openChat(userId: string) {
  newChat.value = false;
  await chatsStore.loadChat(userId);
}

function startNewChat() {
  chatsStore.closeChat();
  newChat.value = true;
}

function findSomeone() {
  // Bazaar's user search: search, add contacts, then Select someone to chat with.
  bzr.social.openPopup(openChat);
}

function back() {
  newChat.value = false;
  chatsStore.closeChat();
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header
      class="hidden h-14 flex-none items-center justify-between border-b border-bzr-line bg-bzr-bar px-5 md:flex"
    >
      <div class="flex items-center gap-2.5">
        <BazaarLogo :width="30" />
        <span class="text-lg font-bold tracking-tight">Chat</span>
      </div>
      <AccountMenu />
    </header>

    <div class="flex min-h-0 flex-1">
      <aside
        class="w-full flex-none flex-col border-bzr-line bg-bzr-side md:flex md:w-[340px] md:border-r"
        :class="showDetail ? 'hidden' : 'flex'"
      >
        <ChatList
          @open="openChat"
          @new-chat="startNewChat"
          @find="findSomeone"
        />
      </aside>

      <main
        class="min-w-0 flex-1 flex-col md:flex"
        :class="showDetail ? 'flex' : 'hidden'"
      >
        <NewChatPanel
          v-if="newChat"
          @open="openChat"
          @find="findSomeone"
          @close="back"
        />
        <ConversationView
          v-else-if="activeChatId"
          :user-id="activeChatId"
          @back="back"
        />
        <div
          v-else
          class="flex flex-1 flex-col items-center justify-center gap-3 text-bzr-muted"
        >
          <BazaarLogo :width="48" />
          <span>Pick a chat, or start a new one.</span>
        </div>
      </main>
    </div>
  </div>
</template>
