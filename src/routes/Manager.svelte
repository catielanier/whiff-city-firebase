<script lang="ts">
  import { writable } from "svelte/store";

  const streamUrl = writable<string>("");
  const isTeams = writable<boolean>(false);
</script>
