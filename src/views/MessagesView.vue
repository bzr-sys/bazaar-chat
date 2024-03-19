<script setup lang="ts">
import { ref, computed } from "vue";
import type { Contact } from "@bzr/bazaar";

import { useContactsStore } from "@/stores/contacts";
import { useIndividualChatsStore, type Chat } from "@/stores/individualChats";

import { bzr } from "@/bazaar";

const contactsStore = useContactsStore();
const individualChatsStore = useIndividualChatsStore();

const newChat = ref(false);

const chatlessUsers = computed(() =>
  contactsStore.contacts.filter((c: Contact) => {
    return !individualChatsStore.myChats[c.user.id];
  })
);

async function selectChat(userId: string) {
  await individualChatsStore.loadChat(userId);
  currentChat.value = individualChatsStore.myChats[userId];
  newChat.value = false;
}

// Message view
const currentChat = ref(undefined as undefined | Chat);
const message = ref("" as string);
async function sendIndividualMessage() {
  if (!currentChat.value) {
    console.log("needs user");
    // TODO better signal
    return;
  }
  if (message.value == "") {
    console.log("needs message");
    // TODO better signal
    return;
  }
  await individualChatsStore.postMessage(currentChat.value.id, message.value);
  message.value = "";
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- header -->
    <div class="bg-blue-400 p-3 mx-auto w-[min(800px,100vw)]">
      <div v-if="currentChat" class="flex justify-between items-center">
        <!-- Message view -->
        <div>
          {{ currentChat.name || currentChat.id }}
        </div>
        <button
          @click="currentChat = undefined"
          class="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
        >
          x
        </button>
      </div>

      <div v-else class="w-full">
        <div v-if="newChat" class="flex justify-between items-center">
          <div>New Chat</div>
          <button
            @click="newChat = false"
            class="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
          >
            x
          </button>
        </div>
        <div v-else class="flex justify-between items-center">
          <div>Chats</div>
          <button
            @click="newChat = true"
            class="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <!-- body -->

    <div
      class="bg-blue-200 mx-auto w-[min(800px,100vw)] flex flex-col flex-grow"
    >
      <!-- selected chat messages-->
      <div v-if="currentChat" class="flex flex-col flex-grow justify-end gap-2">
        <div
          v-for="p in individualChatsStore.chatMessages(currentChat.id)"
          :key="p.id"
          class="message"
          :data-type="p.userId == currentChat.id ? 'other' : 'mine'"
        >
          <div class="message_ts">{{ p.ts }}</div>
          <div class="message_text">{{ p.text }}</div>
        </div>

        <div class="w-full flex">
          <input class="w-full" type="text" v-model="message" />
          <button
            @click="sendIndividualMessage"
            class="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
          >
            Send
          </button>
        </div>
      </div>

      <!-- create new chat -->
      <div v-else-if="newChat" class="grid">
        <div class="p-3 bg-blue-200">
          Search / Add Contact
          <!-- <input type="text" v-model="newContact" /> -->
          <button
            @click="bzr.social.openModal(selectChat)"
            class="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
          >
            +
          </button>
        </div>

        <div class="p-2 bg-blue-300 italic">Select contact</div>

        <template v-if="chatlessUsers.length > 0">
          <div
            v-for="c in chatlessUsers"
            :key="c.id"
            class="p-3 bg-blue-200"
            @click="selectChat(c.user.id)"
          >
            {{ c.user.name || c.user.id }}
          </div>
        </template>
        <template v-else>
          <div class="p-3 bg-blue-200">No available contacts</div>
        </template>
      </div>

      <!-- all individual chats -->
      <div v-else class="grid">
        <div
          v-for="c in individualChatsStore.sortedChats"
          :key="c.id"
          class="p-3 bg-blue-300"
          @click="selectChat(c.id)"
        >
          {{ c.name || c.id }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
