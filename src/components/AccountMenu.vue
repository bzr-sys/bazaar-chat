<script setup lang="ts">
import { ref } from "vue";

import UserAvatar from "@/components/UserAvatar.vue";
import { useAuthStore } from "@/stores/auth";
import { useUsersStore } from "@/stores/users";

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

const authStore = useAuthStore();
const usersStore = useUsersStore();
const open = ref(false);
</script>

<template>
  <div class="relative" @keydown.esc="open = false">
    <button
      type="button"
      class="flex items-center gap-2.5 rounded-bzr border text-bzr-text"
      :class="[
        compact ? 'p-0 border-transparent' : 'px-2.5 py-1.5',
        open ? 'border-[#555555] bg-bzr-field' : 'border-[#3a3a3a]',
      ]"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-label="Account menu"
      @click="open = !open"
    >
      <UserAvatar
        :user-id="usersStore.user.id"
        :name="usersStore.user.name"
        :size="compact ? 44 : 28"
        primary
      />
      <template v-if="!compact">
        <span class="font-semibold">{{ usersStore.user.name }}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-bzr-muted"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </template>
    </button>

    <template v-if="open">
      <div class="fixed inset-0 z-10" @click="open = false"></div>
      <div
        role="menu"
        class="absolute right-0 top-full z-20 mt-2 flex w-60 flex-col rounded-bzr border border-bzr-edge bg-bzr-field p-1.5 shadow-xl"
      >
        <div class="flex flex-col border-b border-[#3a3a3a] p-2.5">
          <span class="font-bold">{{ usersStore.user.name }}</span>
          <span class="text-[13px] text-bzr-muted"
            >@{{ usersStore.user.handle }}</span
          >
        </div>
        <button
          type="button"
          role="menuitem"
          class="rounded-bzr px-2.5 py-3 text-left font-semibold text-bzr-danger hover:bg-bzr-hover"
          @click="authStore.logOut()"
        >
          Log out
        </button>
      </div>
    </template>
  </div>
</template>
