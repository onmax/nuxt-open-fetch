export function openFetchRequestInterceptor(ctx) {
  ctx.request = fillPath(ctx.request, ctx.options.path);
}
function createHook(hooks, baseOpts, hook, hookIdentifier) {
  return async (...args) => {
    await hooks.callHook(`openFetch:${hook}`, ...args);
    if (hookIdentifier) {
      await hooks.callHook(`openFetch:${hook}:${hookIdentifier}`, ...args);
    }
    const ctx = args[0];
    const baseHook = baseOpts[hook];
    if (baseHook) {
      await (Array.isArray(baseHook) ? Promise.all(baseHook.map((h) => h(ctx))) : baseHook(ctx));
    }
  };
}
function getOpenFetchHooks(hooks, baseOpts, hookIdentifier) {
  const openFetchHooks = [
    "onRequest",
    "onRequestError",
    "onResponse",
    "onResponseError"
  ];
  if (!hooks)
    return {};
  return openFetchHooks.reduce((acc, hook) => {
    acc[hook] = createHook(hooks, baseOpts, hook, hookIdentifier);
    return acc;
  }, {});
}
export function createOpenFetch(options, localFetch, hookIdentifier, hooks = null) {
  return (url, baseOpts) => {
    baseOpts = typeof options === "function" ? options(baseOpts) : {
      ...options,
      ...baseOpts
    };
    const opts = {
      ...baseOpts,
      ...getOpenFetchHooks(hooks, baseOpts, hookIdentifier)
    };
    if (opts.body && opts.bodySerializer) {
      opts.body = opts.bodySerializer(opts.body);
    }
    if (opts.header) {
      opts.headers = opts.header;
      delete opts.header;
    }
    opts.headers = new Headers(opts.headers);
    if (opts.accept) {
      opts.headers.set(
        "Accept",
        Array.isArray(opts.accept) ? opts.accept.join(", ") : opts.accept
      );
      delete opts.accept;
    }
    const $fetch = getFetch(url, opts, localFetch);
    return $fetch(fillPath(url, opts?.path), opts);
  };
}
function getFetch(url, opts, localFetch) {
  if (import.meta.server && localFetch) {
    const isLocalFetch = url[0] === "/" && (!opts.baseURL || opts.baseURL[0] === "/");
    if (isLocalFetch)
      return localFetch;
  }
  return globalThis.$fetch;
}
export function fillPath(path, params = {}) {
  for (const [k, v] of Object.entries(params)) path = path.replace(`{${k}}`, encodeURIComponent(String(v)));
  return path;
}
