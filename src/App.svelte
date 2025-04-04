<script lang="ts">
  import { onMount } from "svelte";
  import { Router, Route } from "svelte-routing";
  import Update from "./routes/Update.svelte";
  import Login from "./routes/Login.svelte";
  import Scoreboard from "./routes/Scoreboard.svelte";
  import Commentators from "./routes/Commentators.svelte";
  import { getToken } from "./utils/tokenService";
  import StreamQueue from "./routes/StreamQueue.svelte";
  import Manager from "./routes/Manager.svelte";

  let loggedIn: boolean | null;

  export const setLogin = (): void => {
    loggedIn = true;
  };

  onMount(() => {
    loggedIn = !!getToken();
  });

  let url: string = "";
</script>

<Router {url}>
  <main>
    {#if loggedIn}
      <Route path="/" component={Update} />
      <Route path="/manager" component={Manager} />
    {:else}
      <Route path="/"><Login {setLogin} /></Route>
    {/if}
    <Route exact path="/scoreboard/:id" component={Scoreboard} />
    <Route exact path="/commentators/:id" component={Commentators} />
    <Route exact path="/queue/:id" component={StreamQueue} />
  </main>
</Router>
