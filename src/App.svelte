<script lang="ts">
  import {onMount} from "svelte";
  import {Router, Route} from "svelte-routing";
  import Update from "./routes/Update.svelte";
  import Login from "./routes/Login.svelte";
  import Scoreboard from "./routes/Scoreboard.svelte";
  import Commentators from "./routes/Commentators.svelte";
  import {getToken} from "./utils/tokenService";

  let loggedIn: boolean | null;

  export const setLogin = (): void => {
    loggedIn = true;
  }

  onMount(() => {
    loggedIn = !!getToken();
  })

  let url: string = "";
</script>

<Router {url}>
  <main>
    {#if loggedIn}
      <Route path="/" component={Update} />
    {:else}
      <Route path="/"><Login {setLogin} /></Route>
    {/if}
    <Route exact path="/scoreboard" component={Scoreboard} />
    <Route exact path="/commentators" component={Commentators} />
  </main>
</Router>
