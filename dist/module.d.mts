import * as _nuxt_schema from '@nuxt/schema';
import { Readable } from 'node:stream';
import { FetchOptions } from 'ofetch';
import { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript';

type OpenAPI3Schema = string | URL | OpenAPI3 | Readable;
interface OpenFetchOptions extends Pick<FetchOptions, 'baseURL' | 'query' | 'headers'> {
}
interface OpenFetchClientOptions extends OpenFetchOptions {
    schema?: OpenAPI3Schema;
}
interface ModuleOptions {
    clients?: Record<string, OpenFetchClientOptions>;
    openAPITS?: OpenAPITSOptions;
    disableNuxtPlugin?: boolean;
    disableNitroPlugin?: boolean;
}
declare const _default: _nuxt_schema.NuxtModule<ModuleOptions, ModuleOptions, false>;

interface SchemaOptions {
    name: string;
    schema: string | URL | OpenAPI3 | Readable;
    openAPITS?: object;
    moduleName: string;
    nuxtBuildDir: string;
    resolvePath: (...paths: string[]) => string;
}
declare function addCachedSchemaTemplate({ name, schema, openAPITS, moduleName, nuxtBuildDir, resolvePath, }: SchemaOptions): Promise<string>;

export { addCachedSchemaTemplate, _default as default };
export type { ModuleOptions, OpenFetchClientOptions, OpenFetchOptions };
