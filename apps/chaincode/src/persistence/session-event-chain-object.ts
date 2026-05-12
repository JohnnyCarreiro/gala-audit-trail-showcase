import { ChainKey, ChainObject, StringEnumProperty } from "@gala-chain/api";
import { Exclude } from "class-transformer";
import { IsInt, IsObject, IsString, IsUUID, Matches, Min } from "class-validator";
import { EventType } from "../domain/types";

/**
 * Persistence shape for `SessionEvent`. Composite key `(sessionId, sequence)`
 * so events of one session co-locate naturally on the ledger and reading
 * "all events for session X" is a range scan via
 * `getObjectsByPartialCompositeKey`.
 */
export class SessionEventChainObject extends ChainObject {
  @Exclude()
  static INDEX_KEY = "GAUDE";

  @ChainKey({ position: 0 })
  @IsUUID(4)
  sessionId!: string;

  @ChainKey({ position: 1 })
  @IsInt()
  @Min(1)
  sequence!: number;

  @IsUUID(4)
  eventId!: string;

  @StringEnumProperty(EventType)
  eventType!: EventType;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsString()
  @Matches(/^0x[0-9a-f]{64}$/, { message: "prevHash must be 0x + 64 hex chars" })
  prevHash!: string;

  @IsString()
  signedBy!: string;

  @IsString()
  signature!: string;

  @IsString()
  timestamp!: string;
}
