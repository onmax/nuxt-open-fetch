import { useFetch, useNuxtApp } from "nuxt/app";
import { digest } from "ohash";
import { toValue } from "vue";
export function createUseOpenFetch(client, lazy = false) {
  return (url, options = {}) => {
    const nuxtApp = useNuxtApp();
    const fetch = typeof client === "string" ? nuxtApp[`$${client}`] : client;
    const key = options.key ?? createAutoKey(client.toString(), url, options);
    const opts = { $fetch: fetch, key, ...options };
    return useFetch(url, lazy ? { ...opts, lazy } : { ...opts });
  };
}
function createAutoKey(client, url, options) {
  const resolvedRequestOptions = {
    url,
    method: options.method,
    path: options.path,
    query: options.query,
    body: options.body
  };
  const resolvedRequestOptionsJson = JSON.stringify(resolvedRequestOptions, (_, value) => toValue(value));
  return `$${client}-${digest(resolvedRequestOptionsJson)}`;
}
