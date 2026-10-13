<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { bzr } from "@/bazaar";

import BazaarLogo from "@/components/BazaarLogo.vue";
import MessagesView from "@/views/MessagesView.vue";

const authStore = useAuthStore();
authStore.autoSignIn();

bzr.onLogin(async () => {
  authStore.autoSignIn();
});

function login(): void {
  bzr.login();
}

const skeleton = [
  { w1: "60%", w2: "35%" },
  { w1: "45%", w2: "25%" },
  { w1: "70%", w2: "40%" },
  { w1: "50%", w2: "30%" },
  { w1: "65%", w2: "20%" },
];
</script>

<template>
  <MessagesView v-if="authStore.authenticated" />

  <!-- S2: signing in with a stored token -->
  <div v-else-if="authStore.loading" class="flex h-full flex-col">
    <header
      class="hidden h-14 flex-none items-center gap-2.5 border-b border-bzr-line bg-bzr-bar px-5 md:flex"
    >
      <BazaarLogo :width="30" />
      <span class="text-lg font-bold tracking-tight">Chat</span>
    </header>
    <div class="flex min-h-0 flex-1">
      <div
        class="flex w-full flex-col gap-3.5 bg-bzr-side p-4 md:w-[340px] md:border-r md:border-bzr-line"
        aria-busy="true"
      >
        <div class="flex items-center justify-between">
          <span class="text-[26px] font-bold md:text-xl">Chats</span>
          <span class="h-9 w-24 rounded-bzr bg-bzr-bubble"></span>
        </div>
        <div
          v-for="(s, i) in skeleton"
          :key="i"
          class="flex items-center gap-3"
        >
          <span class="h-10 w-10 rounded-bzr bg-bzr-bubble"></span>
          <span class="flex flex-1 flex-col gap-1.5">
            <span
              class="h-3 rounded-sm bg-bzr-bubble"
              :style="{ width: s.w1 }"
            ></span>
            <span
              class="h-2.5 rounded-sm bg-bzr-field"
              :style="{ width: s.w2 }"
            ></span>
          </span>
        </div>
        <div class="mt-auto text-center text-[13px] text-bzr-muted">
          Connecting to Bazaar…
        </div>
      </div>
    </div>
  </div>

  <!-- S1: logged out -->
  <div v-else class="flex h-full items-center justify-center p-6">
    <div
      class="flex max-w-sm flex-col items-center gap-[18px] rounded-bzr border border-bzr-line bg-bzr-bg px-7 py-10 text-center"
    >
      <BazaarLogo :width="64" />
      <h1 class="text-2xl font-bold">Bazaar Chat</h1>
      <p class="text-bzr-soft">
        Private one-to-one messages. Every message is stored in its sender's own
        Bazaar space.
      </p>
      <button
        type="button"
        class="h-11 rounded-bzr bg-bzr-primary px-5 font-bold text-bzr-bg hover:bg-bzr-gold"
        @click="login"
      >
        Log in with Bazaar
      </button>
      <p class="text-[13px] text-bzr-muted">
        Opens a Bazaar window. New to Bazaar? You can sign up there.
      </p>
    </div>
  </div>
</template>
