import { defineNitroPlugin, useRuntimeConfig } from "#imports";
import { createOpenFetch } from "./fetch.js";
export default defineNitroPlugin((nitroApp) => {
  const clients = useRuntimeConfig().public.openFetch;
  Object.entries(clients).forEach(([name, client]) => {
    nitroApp[`$${name}`] = createOpenFetch(client, nitroApp.localFetch, name, nitroApp.hooks);
  });
});
