import type { OpenFetchClientName } from '#build/open-fetch';
import type { AsyncData, UseFetchOptions } from 'nuxt/app';
import type { $Fetch } from 'ofetch';
import type { Ref } from 'vue';
import type { AcceptMediaTypeOption, BodySerializerOption, ExtractMediaType, FetchResponseData, FetchResponseError, FilterMethods, ParamsOption, RequestBodyOption } from './fetch.js';
type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]> : T;
type KeysOf<T> = Array<T extends T ? keyof T extends string ? keyof T : never : never>;
type ComputedOptions<T> = {
    [K in keyof T]: T[K] extends Function ? T[K] : ComputedOptions<T[K]> | Ref<T[K]> | T[K];
};
type ComputedMethodOption<M, P> = 'get' extends keyof P ? ComputedOptions<{
    method?: M;
}> : ComputedOptions<{
    method: M;
}>;
type UseOpenFetchOptions<Method, LowercasedMethod, Params, Media, ResT, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = null, Operation = 'get' extends LowercasedMethod ? ('get' extends keyof Params ? Params['get'] : never) : LowercasedMethod extends keyof Params ? Params[LowercasedMethod] : never> = ComputedMethodOption<Method, Params> & ComputedOptions<ParamsOption<Operation>> & ComputedOptions<RequestBodyOption<Operation>> & ComputedOptions<AcceptMediaTypeOption<Media>> & ComputedOptions<BodySerializerOption<RequestBodyOption<Operation>['body']>> & Omit<UseFetchOptions<ResT, DataT, PickKeys, DefaultT>, 'query' | 'body' | 'method'>;
export type UseOpenFetchClient<Paths, Lazy> = <ReqT extends Extract<keyof Paths, string>, Methods extends FilterMethods<Paths[ReqT]>, Method extends Extract<keyof Methods, string> | Uppercase<Extract<keyof Methods, string>>, LowercasedMethod extends Lowercase<Method> extends keyof Methods ? Lowercase<Method> : never, DefaultMethod extends 'get' extends LowercasedMethod ? 'get' : LowercasedMethod, Media extends ExtractMediaType<Methods[DefaultMethod]>, ResT = Methods[DefaultMethod] extends Record<string | number, any> ? FetchResponseData<Methods[DefaultMethod], Media> : never, ErrorT = Methods[DefaultMethod] extends Record<string | number, any> ? FetchResponseError<Methods[DefaultMethod]> : never, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(url: ReqT | (() => ReqT), options?: Lazy extends true ? Omit<UseOpenFetchOptions<Method, LowercasedMethod, Methods, Media, ResT, DataT, PickKeys, DefaultT>, 'lazy'> : UseOpenFetchOptions<Method, LowercasedMethod, Methods, Media, ResT, DataT, PickKeys, DefaultT>) => AsyncData<PickFrom<DataT, PickKeys> | DefaultT, ErrorT | undefined>;
export declare function createUseOpenFetch<Paths, Lazy = false>(client: $Fetch | OpenFetchClientName, lazy?: Lazy): UseOpenFetchClient<Paths, Lazy>;
export declare function createUseOpenFetch<Paths, Lazy = true>(client: $Fetch | OpenFetchClientName, lazy?: Lazy): UseOpenFetchClient<Paths, Lazy>;
export {};
