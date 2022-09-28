import { Headers } from '@adxp/xrpc';
export interface QueryParams {
}
export interface CallOptions {
    headers?: Headers;
}
export declare type InputSchema = undefined;
export interface OutputSchema {
    inviteCodeRequired?: boolean;
    availableUserDomains: string[];
}
export interface Response {
    success: boolean;
    headers: Headers;
    data: OutputSchema;
}
export declare function toKnownErr(e: any): any;
