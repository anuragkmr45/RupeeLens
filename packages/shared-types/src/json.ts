export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export type JsonArray = JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}
