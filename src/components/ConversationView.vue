<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import UserAvatar from "@/components/UserAvatar.vue";
import { useIndividualChatsStore } from "@/stores/individualChats";
import { useUsersStore } from "@/stores/users";
import { dayKey, dayLabel, messageTime, now } from "@/utils/time";

const props = defineProps<{ userId: string }>();
const emit = defineEmits<{ back: [] }>();

const chatsStore = useIndividualChatsStore();
const usersStore = useUsersStore();

// Consecutive messages from one person within this window share one time label.
const RUN_GAP_MS = 5 * 60 * 1000;

const name = computed(
  () =>
    chatsStore.myChats[props.userId]?.name ||
    usersStore.profiles[props.userId]?.name ||
    "",
);
const firstName = computed(() => name.value.split(" ")[0] || "them");
const handle = computed(() => usersStore.profiles[props.userId]?.handle);
const status = computed(() => chatsStore.peerStatus[props.userId]);
const messages = computed(() => chatsStore.chatMessages(props.userId));
const sending = computed(() => chatsStore.sendingMessages[props.userId] ?? []);
const failed = computed(() => chatsStore.failedMessages[props.userId] ?? []);

type Item =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "message";
      key: string;
      mine: boolean;
      text: string;
      time: string;
      startsRun: boolean;
    };

const items = computed(() => {
  const list = messages.value;
  const out: Item[] = [];
  let day: number | undefined;
  list.forEach((m, i) => {
    const thisDay = dayKey(m.ts);
    if (thisDay !== day) {
      out.push({
        kind: "day",
        key: `day-${thisDay}`,
        label: dayLabel(m.ts, now.value),
      });
      day = thisDay;
    }
    const t = new Date(m.ts).getTime();
    const prev = list[i - 1];
    const next = list[i + 1];
    const sameRun = (a: typeof m | undefined, aTime: number) =>
      !!a &&
      a.userId === m.userId &&
      Math.abs(aTime - t) < RUN_GAP_MS &&
      dayKey(a.ts) === thisDay;
    const continuesAfter = sameRun(
      next,
      next ? new Date(next.ts).getTime() : 0,
    );
    out.push({
      kind: "message",
      key: `${m.userId}-${m.id}`,
      mine: m.userId === usersStore.user.id,
      text: m.text,
      time: continuesAfter ? "" : messageTime(m.ts, now.value),
      startsRun:
        i > 0 && !sameRun(prev, prev ? new Date(prev.ts).getTime() : 0),
    });
  });
  return out;
});

// Scrolling: stay at the newest message unless the reader has scrolled up.
const scroller = ref<HTMLElement>();
const newCount = ref(0);

function isAtBottom(): boolean {
  const el = scroller.value;
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

function scrollToBottom() {
  const el = scroller.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
  newCount.value = 0;
}

function onScroll() {
  if (isAtBottom()) {
    newCount.value = 0;
  }
}

watch(
  () => messages.value.length + sending.value.length + failed.value.length,
  async (count, oldCount) => {
    const wasAtBottom = isAtBottom();
    const last = messages.value[messages.value.length - 1];
    await nextTick();
    if (wasAtBottom || last?.userId === usersStore.user.id) {
      scrollToBottom();
    } else if (count > oldCount) {
      newCount.value += count - oldCount;
    }
  },
);

// Composer
const drafts = ref({} as { [userId: string]: string });
const draft = computed({
  get: () => drafts.value[props.userId] ?? "",
  set: (v: string) => {
    drafts.value[props.userId] = v;
  },
});
const canSend = computed(() => draft.value.trim() !== "");
const composer = ref<HTMLTextAreaElement>();

function resizeComposer() {
  const el = composer.value;
  if (!el) {
    return;
  }
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

async function send() {
  if (!canSend.value) {
    return;
  }
  const text = draft.value;
  draft.value = "";
  await nextTick();
  resizeComposer();
  await chatsStore.sendMessage(props.userId, text);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== "Enter" || e.shiftKey || e.isComposing) {
    return;
  }
  e.preventDefault();
  send();
}

watch(
  () => props.userId,
  async () => {
    newCount.value = 0;
    await nextTick();
    resizeComposer();
    scrollToBottom();
    // Focus the composer on desktop; on phones this would pop up the keyboard.
    if (window.matchMedia("(min-width: 768px)").matches) {
      composer.value?.focus();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col bg-bzr-bg">
    <div
      class="flex h-[72px] flex-none items-center gap-3 border-b border-bzr-line px-3 md:h-16 md:px-6"
    >
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center md:hidden"
        aria-label="Back to chats"
        @click="emit('back')"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <UserAvatar :user-id="userId" :name="name" :size="36" />
      <div class="flex min-w-0 flex-col">
        <h2 class="truncate text-base font-bold">{{ name || userId }}</h2>
        <span v-if="handle" class="text-[13px] text-bzr-muted"
          >@{{ handle }}</span
        >
      </div>
    </div>

    <div class="relative flex min-h-0 flex-1 flex-col">
      <div
        ref="scroller"
        class="flex min-h-0 flex-1 flex-col overflow-y-auto"
        @scroll="onScroll"
      >
        <!-- S6: not on Bazaar Chat, nothing written yet -->
        <div
          v-if="status === 'not-app-user' && messages.length === 0"
          class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#eabf7d"
            stroke-width="1.8"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-7 8-7" />
            <path d="M17 15v6M14 18h6" />
          </svg>
          <div class="text-[17px] font-bold">
            {{ firstName }} isn't using Bazaar Chat yet
          </div>
          <div class="max-w-sm text-sm text-bzr-soft">
            You can still write. Your messages stay in your Bazaar space, and
            {{ firstName }} can read them once they open Bazaar Chat.
          </div>
        </div>

        <div
          v-else
          class="mt-auto flex flex-col gap-1.5 px-4 py-5 md:px-6"
          role="log"
        >
          <template v-for="item in items" :key="item.key">
            <div
              v-if="item.kind === 'day'"
              class="flex items-center gap-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-bzr-muted"
            >
              <span class="h-px flex-1 bg-bzr-line"></span>{{ item.label
              }}<span class="h-px flex-1 bg-bzr-line"></span>
            </div>
            <div
              v-else
              class="flex flex-col"
              :class="[
                item.mine ? 'items-end' : 'items-start',
                item.startsRun ? 'mt-2.5' : '',
              ]"
            >
              <div
                class="max-w-[80%] whitespace-pre-wrap break-words rounded-bzr px-3.5 py-2.5 md:max-w-[560px]"
                :class="
                  item.mine
                    ? 'bg-bzr-primary text-bzr-bg'
                    : 'bg-bzr-bubble text-bzr-text'
                "
              >
                {{ item.text }}
              </div>
              <span
                v-if="item.time"
                class="px-0.5 pt-1 text-xs text-bzr-muted"
                >{{ item.time }}</span
              >
            </div>
          </template>

          <!-- Sent but not yet confirmed (e.g. while offline) -->
          <div
            v-for="m in sending"
            :key="m.id"
            class="mt-2.5 flex flex-col items-end"
          >
            <div
              class="max-w-[80%] whitespace-pre-wrap break-words rounded-bzr bg-bzr-primary px-3.5 py-2.5 text-bzr-bg opacity-60 md:max-w-[560px]"
            >
              {{ m.text }}
            </div>
            <span class="px-0.5 pt-1 text-xs text-bzr-muted">Sending…</span>
          </div>

          <!-- S7: messages that could not be sent -->
          <div
            v-for="f in failed"
            :key="f.id"
            class="mt-2.5 flex flex-col items-end"
          >
            <div
              class="max-w-[80%] whitespace-pre-wrap break-words rounded-bzr border border-dashed border-bzr-primary bg-bzr-primary-tint px-3.5 py-2.5 md:max-w-[560px]"
            >
              {{ f.text }}
            </div>
            <div class="flex items-center gap-2.5 pt-1 text-[13px]">
              <span class="text-bzr-danger">Not sent</span>
              <button
                type="button"
                class="font-bold text-bzr-gold underline"
                @click="chatsStore.retryMessage(userId, f.id)"
              >
                Retry
              </button>
            </div>
          </div>

          <!-- S5: they have not opened the chat yet -->
          <div
            v-if="status === 'pending'"
            class="mt-2 flex gap-2.5 rounded-bzr border border-[#3a3a3a] bg-[#242424] p-3 text-[13px] text-[#d4d4d4]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a3a3a3"
              stroke-width="2"
              stroke-linecap="round"
              class="flex-none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span
              >{{ firstName }} hasn't replied yet. Your messages already show up
              in their chat list.</span
            >
          </div>
          <div
            v-else-if="status === 'not-app-user'"
            class="mt-2 rounded-bzr border border-[#3a3a3a] bg-[#242424] p-3 text-[13px] text-[#d4d4d4]"
          >
            {{ firstName }} isn't using Bazaar Chat yet and can read your
            messages once they open it.
          </div>
          <div
            v-else-if="status === 'error'"
            class="mt-2 flex items-center justify-between gap-3 rounded-bzr border border-[#3a3a3a] bg-[#242424] p-3 text-[13px] text-[#d4d4d4]"
          >
            <span>Couldn't load {{ firstName }}'s messages.</span>
            <button
              type="button"
              class="font-bold text-bzr-gold underline"
              @click="chatsStore.loadOtherMessages(userId)"
            >
              Retry
            </button>
          </div>
        </div>
      </div>

      <button
        v-if="newCount > 0"
        type="button"
        class="absolute bottom-2 left-1/2 flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-bzr-primary-edge bg-bzr-bubble px-3.5 text-sm font-semibold text-bzr-gold shadow-lg"
        @click="scrollToBottom"
      >
        {{ newCount }} new {{ newCount === 1 ? "message" : "messages" }}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </button>
    </div>

    <div
      class="flex flex-none flex-col gap-1.5 border-t border-bzr-line px-3 pb-7 pt-2.5 md:px-6 md:pb-[18px] md:pt-3"
    >
      <div class="flex items-end gap-2.5">
        <label class="flex flex-1">
          <span class="sr-only">Message {{ firstName }}</span>
          <textarea
            ref="composer"
            v-model="draft"
            rows="1"
            :placeholder="`Message ${firstName}`"
            class="min-h-11 w-full resize-none rounded-bzr border border-bzr-edge bg-bzr-field px-3 py-[10px] text-bzr-text placeholder:text-bzr-muted focus:border-bzr-primary focus:outline-none"
            @input="resizeComposer"
            @keydown="onKeydown"
          ></textarea>
        </label>
        <button
          type="button"
          class="flex h-11 flex-none items-center justify-center rounded-bzr font-bold disabled:cursor-not-allowed max-md:w-11 md:px-[18px]"
          :class="
            canSend
              ? 'bg-bzr-primary text-bzr-bg hover:bg-bzr-gold'
              : 'bg-bzr-primary-dim text-bzr-muted'
          "
          :disabled="!canSend"
          aria-label="Send"
          @click="send"
        >
          <span class="hidden md:inline">Send</span>
          <svg
            class="md:hidden"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <div class="hidden text-xs text-bzr-muted md:block">
        Enter to send · Shift+Enter for a new line
      </div>
    </div>
  </div>
</template>
