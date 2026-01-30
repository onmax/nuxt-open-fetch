import { defineNuxtPlugin, useRequestFetch, useRuntimeConfig } from "#imports";
import { createOpenFetch } from "./fetch.js";
export default defineNuxtPlugin({
  enforce: "pre",
  setup(nuxtApp) {
    const clients = useRuntimeConfig().public.openFetch;
    const $fetch = useRequestFetch();
    return {
      provide: Object.entries(clients).reduce((acc, [name, client]) => ({
        ...acc,
        [name]: createOpenFetch(client, $fetch, name, nuxtApp.hooks)
      }), {})
    };
  }
});
