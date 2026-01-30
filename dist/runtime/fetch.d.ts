import type { Hookable } from 'hookable';
import type { FetchContext, FetchError, FetchOptions } from 'ofetch';
import type { ErrorResponse, MediaType, OkStatus, OperationRequestBodyContent, ResponseContent, ResponseObjectMap, SuccessResponse } from 'openapi-typescript-helpers';
export type FetchResponseData<T extends Record<string | number, any>, Media extends MediaType = MediaType> = SuccessResponse<ResponseObjectMap<T>, Media>;
export type FetchResponseError<T extends Record<string | number, any>> = FetchError<ErrorResponse<ResponseObjectMap<T>, MediaType>>;
export type MethodOption<M, P> = 'get' extends keyof P ? {
    method?: M;
} : {
    method: M;
};
export type ParamsOption<T> = T extends {
    parameters?: any;
    query?: any;
} ? T['parameters'] : Record<string, never>;
export type RequestBodyOption<T> = OperationRequestBodyContent<T> extends never ? {
    body?: never;
} : undefined extends OperationRequestBodyContent<T> ? {
    body?: OperationRequestBodyContent<T>;
} : {
    body: OperationRequestBodyContent<T>;
};
export interface AcceptMediaTypeOption<M> {
    accept?: M | M[];
}
export interface BodySerializerOption<TBody> {
    bodySerializer?: (body: TBody) => any;
}
export type FilterMethods<T> = {
    [K in keyof Omit<T, 'parameters'> as T[K] extends never | undefined ? never : K]: T[K];
};
export type ExtractMediaType<T> = ResponseObjectMap<T> extends Record<string | number, any> ? {
    [S in OkStatus]: Extract<keyof ResponseContent<ResponseObjectMap<T>[S]>, MediaType>;
}[OkStatus] : never;
type OpenFetchOptions<Method, LowercasedMethod, Params, Media, Operation = 'get' extends LowercasedMethod ? ('get' extends keyof Params ? Params['get'] : never) : (LowercasedMethod extends keyof Params ? Params[LowercasedMethod] : never)> = MethodOption<Method, Params> & ParamsOption<Operation> & RequestBodyOption<Operation> & AcceptMediaTypeOption<Media> & Omit<FetchOptions, 'query' | 'body' | 'method'> & BodySerializerOption<RequestBodyOption<Operation>['body']>;
export type OpenFetchClient<Paths> = <ReqT extends Extract<keyof Paths, string>, Methods extends FilterMethods<Paths[ReqT]>, Method extends Extract<keyof Methods, string> | Uppercase<Extract<keyof Methods, string>>, LowercasedMethod extends (Lowercase<Method> extends keyof Methods ? Lowercase<Method> : never), DefaultMethod extends ('get' extends LowercasedMethod ? 'get' : LowercasedMethod), Media extends ExtractMediaType<Methods[DefaultMethod]>, ResT = Methods[DefaultMethod] extends Record<string | number, any> ? FetchResponseData<Methods[DefaultMethod], Media> : never>(url: ReqT, options?: OpenFetchOptions<Method, LowercasedMethod, Methods, Media>) => Promise<ResT>;
export declare function openFetchRequestInterceptor(ctx: FetchContext): void;
export declare function createOpenFetch<Paths>(options: FetchOptions | ((options: FetchOptions) => FetchOptions), localFetch?: typeof globalThis.$fetch, hookIdentifier?: string, hooks?: Hookable<any> | null): OpenFetchClient<Paths>;
export declare function fillPath(path: string, params?: Record<string, string>): string;
export {};
