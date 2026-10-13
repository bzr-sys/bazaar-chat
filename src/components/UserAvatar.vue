<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    userId: string;
    name?: string;
    size?: number;
    dashed?: boolean;
    primary?: boolean;
  }>(),
  { name: "", size: 40, dashed: false, primary: false },
);

// Muted tints that keep 4.5:1 contrast for the initials on the dark theme.
const tints = [
  { bg: "#4a3726", ink: "#eabf7d" },
  { bg: "#2f3b4a", ink: "#bfd3ea" },
  { bg: "#3b2f45", ink: "#d9c4ee" },
  { bg: "#2e4038", ink: "#bfe3cf" },
  { bg: "#45302f", ink: "#eec4bf" },
];

const initials = computed(() => {
  const words = props.name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "?";
  }
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
});

const style = computed(() => {
  const base = {
    width: `${props.size}px`,
    height: `${props.size}px`,
    fontSize: `${Math.round(props.size * 0.35)}px`,
  };
  if (props.dashed) {
    return base;
  }
  if (props.primary) {
    return { ...base, background: "#db9a59", color: "#1c1c1c" };
  }
  let hash = 0;
  for (const ch of props.userId) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  const tint = tints[Math.abs(hash) % tints.length];
  return { ...base, background: tint.bg, color: tint.ink };
});
</script>

<template>
  <span
    class="flex flex-none select-none items-center justify-center rounded-bzr font-bold"
    :class="
      dashed ? 'border border-dashed border-[#555555] text-bzr-muted' : ''
    "
    :style="style"
    aria-hidden="true"
    >{{ initials }}</span
  >
</template>
