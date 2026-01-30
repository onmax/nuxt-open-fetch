import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineNuxtModule, createResolver, addTemplate, addImportsSources, addServerImports, addTypeTemplate, addPlugin, addServerPlugin } from '@nuxt/kit';
import { hash } from 'ohash';
import openapiTS, { astToString } from 'openapi-typescript';
import { join } from 'pathe';
import { kebabCase, pascalCase } from 'scule';

const name = "nuxt-open-fetch";
const version = "0.13.6";

const moduleName = "open-fetch";
const module$1 = defineNuxtModule({
  meta: {
    name,
    version,
    configKey: "openFetch",
    compatibility: {
      nuxt: ">=3.0.0"
    }
  },
  async setup(options, nuxt) {
    if (!options.clients)
      return;
    const { resolve } = createResolver(import.meta.url);
    const schemas = [];
    nuxt.options.runtimeConfig.public.openFetch = Object.fromEntries(Object.entries(options.clients).map(([key, { schema: _, ...options2 }]) => [key, options2]));
    for (const layer of nuxt.options._layers) {
      const { rootDir, openFetch } = layer.config;
      const schemasDir = resolve(rootDir, "openapi");
      const layerClients = Object.entries(options.clients).filter(([key]) => openFetch?.clients?.[key]);
      if (nuxt.options.dev) {
        nuxt.options.watch.push(schemasDir);
      }
      for (const [name2, config] of layerClients) {
        if (schemas.some((item) => item.name === name2) || !config)
          continue;
        let schema = config.schema;
        if (!config.schema) {
          const extensions = ["json", "yaml", "yml"];
          for (const extension of extensions) {
            const filePath = resolve(schemasDir, `${name2}/openapi.${extension}`);
            if (existsSync(filePath)) {
              schema = new URL(`file://${filePath}`);
              break;
            }
          }
        } else if (typeof config.schema === "string") {
          schema = isValidUrl(config.schema) ? config.schema : new URL(`file://${resolve(rootDir, config.schema)}`);
        }
        if (!schema)
          throw new Error(`Could not find OpenAPI schema for "${name2}"`);
        schemas.push({
          name: name2,
          fetchName: {
            composable: getClientName(name2),
            lazyComposable: getClientName(name2, true)
          },
          schema,
          openAPITS: options?.openAPITS
        });
      }
    }
    nuxt.options.alias = {
      ...nuxt.options.alias,
      "#open-fetch": join(nuxt.options.buildDir, moduleName),
      "#open-fetch-schemas/*": join(nuxt.options.buildDir, "types", moduleName, "schemas", "*")
    };
    nuxt.options.optimization = nuxt.options.optimization || {
      keyedComposables: []
    };
    nuxt.options.optimization.keyedComposables = [
      ...nuxt.options.optimization.keyedComposables,
      ...schemas.flatMap(({ fetchName }) => [
        { name: fetchName.composable, argumentLength: 3 },
        { name: fetchName.lazyComposable, argumentLength: 3 }
      ])
    ];
    schemas.forEach(({ name: name2, schema, openAPITS }) => {
      addTemplate({
        filename: `types/${moduleName}/schemas/${kebabCase(name2)}.d.ts`,
        getContents: () => addCachedSchemaTemplate({
          name: name2,
          schema,
          openAPITS,
          moduleName,
          nuxtBuildDir: nuxt.options.buildDir || ".nuxt",
          resolvePath: resolve
        }),
        write: true
      });
    });
    addImportsSources({
      from: resolve(nuxt.options.buildDir, `${moduleName}.ts`),
      imports: schemas.flatMap(({ fetchName }) => Object.values(fetchName))
    });
    addImportsSources({
      from: resolve(`runtime/fetch`),
      imports: [
        "createOpenFetch",
        "openFetchRequestInterceptor",
        "OpenFetchClient",
        "OpenFetchOptions"
      ]
    });
    addImportsSources({
      from: resolve(`runtime/useFetch`),
      imports: [
        "createUseOpenFetch",
        "UseOpenFetchClient"
      ]
    });
    addServerImports([{
      name: "createOpenFetch",
      from: resolve("runtime/fetch")
    }]);
    addServerImports([{
      name: "OpenFetchClient",
      from: resolve("runtime/fetch")
    }]);
    addTypeTemplate({
      filename: "types/open-fetch-hooks.d.ts",
      getContents: () => `
import type { OpenFetchClientName } from '#open-fetch'
import type { FetchHooks } from 'ofetch'

type InferFirstParameter<T> = T extends (arg: infer U, ...args: any[]) => any ? U : never
type InferMaybeArray<T> = T extends Array<infer U> ? U : T
type FetchHooksContext<T extends keyof FetchHooks> = InferFirstParameter<NonNullable<InferMaybeArray<FetchHooks[T]>>>
type HookResult = import('@nuxt/schema').HookResult

export type GlobalFetchHooks = {
  [K in keyof Required<FetchHooks> as \`openFetch:\${K}\`]: (ctx: FetchHooksContext<K>) => HookResult
}

export type ClientFetchHooks = {
  [K in keyof Required<FetchHooks> as \`openFetch:\${K}:\${OpenFetchClientName}\`]: (ctx: FetchHooksContext<K>) => HookResult
}

declare module '#app' {
  interface RuntimeNuxtHooks extends GlobalFetchHooks, ClientFetchHooks {}
}

declare module 'nitropack' {
  interface NitroRuntimeHooks extends GlobalFetchHooks, ClientFetchHooks {}
}

export {}
`
    });
    addTemplate({
      filename: `${moduleName}.ts`,
      getContents() {
        return `
import { createUseOpenFetch } from '#imports'
${schemas.map(({ name: name2 }) => `
import type { paths as ${pascalCase(name2)}Paths, operations as ${pascalCase(name2)}Operations } from '#open-fetch-schemas/${kebabCase(name2)}'
`.trimStart()).join("").trimEnd()}

${schemas.length ? `export type OpenFetchClientName = ${schemas.map(({ name: name2 }) => `'${name2}'`).join(" | ")}` : ""}

${schemas.map(({ name: name2, fetchName }) => `
/**
 * Fetch data from an OpenAPI endpoint with an SSR-friendly composable.
 *
 * @param url - The OpenAPI path to fetch
 * @param opts - Options extending \`useFetch\`, \`$fetch\`, and \`useAsyncData\`.
 *
 * @see https://nuxt-open-fetch.norbiros.dev/composables/useclient
 */
export const ${fetchName.composable} = createUseOpenFetch<${pascalCase(name2)}Paths>('${name2}')
/**
 * Lazily fetch data from an OpenAPI endpoint with an SSR-friendly composable.
 *
 * @param url - The OpenAPI path to fetch
 * @param opts - Options extending \`useFetch\`, \`$fetch\`, and \`useAsyncData\`.
 *
 * @see https://nuxt-open-fetch.norbiros.dev/composables/uselazyclient
 */
export const ${fetchName.lazyComposable} = createUseOpenFetch<${pascalCase(name2)}Paths>('${name2}', true)

export type ${pascalCase(name2)}Response<T extends keyof ${pascalCase(name2)}Operations, R extends keyof ${pascalCase(name2)}Operations[T]['responses'] & number = Extract<keyof ${pascalCase(name2)}Operations[T]['responses'] & number, 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226>> = ${pascalCase(name2)}Operations[T]['responses'][R] extends { content: { 'application/json': infer U } }
  ? U
  : never

export type ${pascalCase(name2)}RequestBody<T extends keyof ${pascalCase(name2)}Operations> = ${pascalCase(name2)}Operations[T] extends { requestBody?: { content: { 'application/json': infer U } } | undefined }
  ? U
  : never

export type ${pascalCase(name2)}RequestQuery<T extends keyof ${pascalCase(name2)}Operations> = ${pascalCase(name2)}Operations[T]['parameters'] extends { query?: infer U } ? U : never

export type ${pascalCase(name2)}RequestPath<T extends keyof ${pascalCase(name2)}Operations> = ${pascalCase(name2)}Operations[T]['parameters'] extends { path?: infer U } ? U : never
`.trimStart()).join("\n")}`.trimStart();
      },
      write: true
    });
    addTypeTemplate({
      filename: `types/${moduleName}/nuxt.d.ts`,
      getContents: () => `
import type { OpenFetchClient } from '#imports'
${schemas.map(({ name: name2 }) => `
import type { paths as ${pascalCase(name2)}Paths } from '#open-fetch-schemas/${kebabCase(name2)}'
`.trimStart()).join("").trimEnd()}

declare module '#app' {
  interface NuxtApp {
    ${schemas.map(({ name: name2 }) => `$${name2}: OpenFetchClient<${pascalCase(name2)}Paths>`.trimStart()).join("\n    ")}
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    ${schemas.map(({ name: name2 }) => `$${name2}: OpenFetchClient<${pascalCase(name2)}Paths>`.trimStart()).join("\n    ")}
  }
}

export {}
`.trimStart()
    });
    addTemplate({
      filename: `types/${moduleName}/nitro.d.ts`,
      getContents: () => `
import type { OpenFetchClient } from '#imports'
${schemas.map(({ name: name2 }) => `
import type { paths as ${pascalCase(name2)}Paths } from '#open-fetch-schemas/${kebabCase(name2)}'
`.trimStart()).join("").trimEnd()}

declare module 'nitropack/types' {
  interface NitroApp {
    ${schemas.map(({ name: name2 }) => `$${name2}: OpenFetchClient<${pascalCase(name2)}Paths>`.trimStart()).join("\n    ")}
  }
}

export {}
`.trimStart()
    });
    nuxt.hook("nitro:config", (nitroConfig) => {
      nitroConfig.typescript?.tsConfig?.include?.push(`./types/${moduleName}/nitro.d.ts`);
    });
    if (!options.disableNuxtPlugin)
      addPlugin(resolve("./runtime/nuxt-plugin"));
    if (!options.disableNitroPlugin) {
      nuxt.options.build.transpile.push(resolve("./runtime/nitro-plugin"));
      addServerPlugin(resolve("./runtime/nitro-plugin"));
    }
  }
});
function getClientName(name2, lazy = false) {
  return `use${lazy ? "Lazy" : ""}${pascalCase(name2)}`;
}
function isValidUrl(url) {
  try {
    return Boolean(new URL(url));
  } catch {
    return false;
  }
}
async function addCachedSchemaTemplate({
  name: name2,
  schema,
  openAPITS,
  moduleName: moduleName2,
  nuxtBuildDir,
  resolvePath
}) {
  const shortName = kebabCase(name2);
  const cacheDir = resolvePath(nuxtBuildDir || ".nuxt", `cache/${moduleName2}`);
  await mkdir(cacheDir, { recursive: true });
  let fileBody = "";
  const filePath = schema instanceof URL ? fileURLToPath(schema) : schema;
  if (typeof filePath === "string" && existsSync(filePath)) {
    fileBody = await readFile(filePath, "utf-8");
  } else {
    const ast2 = await openapiTS(schema, openAPITS);
    return astToString(ast2);
  }
  const key = hash([schema, openAPITS, moduleName2, shortName, fileBody]);
  const cachedPath = resolvePath(cacheDir, `${shortName}-${key}.d.ts`);
  if (existsSync(cachedPath)) {
    return await readFile(cachedPath, "utf-8");
  }
  const ast = await openapiTS(schema, openAPITS);
  const contents = astToString(ast);
  await writeFile(cachedPath, contents, "utf-8");
  for (const file of await readdir(cacheDir)) {
    if (file.startsWith(`${shortName}-`) && file !== `${shortName}-${key}.d.ts`) {
      try {
        await unlink(resolvePath(cacheDir, file));
      } catch {
      }
    }
  }
  return contents;
}

export { addCachedSchemaTemplate, module$1 as default };
