<script setup lang="ts">
// Logo icon paths copied from @bzr/brand (brand/src/logo-paths.ts in the bazaar
// monorepo), which is not published to npm.
withDefaults(defineProps<{ width?: number }>(), { width: 30 });
</script>

<template>
  <svg
    :width="width"
    :height="Math.round((width * 272) / 394)"
    viewBox="0 0 394 272"
    aria-hidden="true"
  >
    <path
      fill="rgb(234, 191, 125)"
      d="M146.783,271.655 L25.151,271.655 C11.294,271.655 0.061,260.421 0.061,246.564 L0.061,100.829 C0.061,86.972 11.294,75.738 25.151,75.738 L146.783,75.738 L146.783,271.655 Z"
    />
    <path
      fill="rgb(219, 154, 89)"
      d="M369.890,271.655 L195.977,271.655 L195.977,100.829 C195.977,86.972 184.744,75.738 170.887,75.738 L146.783,75.738 L146.783,23.596 C146.783,10.574 157.340,0.017 170.363,0.017 L369.890,0.017 C382.913,0.017 393.470,10.574 393.470,23.596 L393.470,248.076 C393.470,261.098 382.913,271.655 369.890,271.655 Z"
    />
  </svg>
</template>
