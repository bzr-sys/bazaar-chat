<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { bzr } from "@/bazaar";

import MessagesView from "@/views/MessagesView.vue";

const authStore = useAuthStore();
authStore.autoSignIn();

bzr.onLogin(async () => {
  authStore.autoSignIn();
});

function login(): void {
  bzr.login();
}
</script>

<template>
  <MessagesView v-if="authStore.authenticated" />
  <div v-else class="m-auto w-fit py-8">
    <button
      @click="login"
      class="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded self-center"
    >
      Log in with Bazaar
    </button>
  </div>
</template>
