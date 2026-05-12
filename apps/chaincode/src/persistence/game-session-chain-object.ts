import { ChainKey, ChainObject, StringEnumProperty } from "@gala-chain/api";
import { Exclude } from "class-transformer";
import { ArrayMinSize, IsArray, IsObject, IsOptional, IsString, IsUUID } from "class-validator";
import { SessionStatus } from "../domain/types";

/**
 * Persistence shape for `GameSession` — the on-chain ChainObject
 * representation. Mirrors the domain interface but uses nullable shapes
 * (`outcomeHash?: string`, `metadata?`) the SDK serializes naturally.
 *
 * Conversion to/from the pure-domain `GameSession` happens in
 * `./converters.ts`. The repository (G4) only ever deals with this type;
 * the domain layer never sees it.
 */
export class GameSessionChainObject extends ChainObject {
  @Exclude()
  static INDEX_KEY = "GAUDS";

  @ChainKey({ position: 0 })
  @IsUUID(4)
  sessionId!: string;

  @IsString()
  gameId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  players!: string[];

  @IsString()
  studioSigner!: string;

  @StringEnumProperty(SessionStatus)
  status!: SessionStatus;

  @IsString()
  createdAt!: string;

  @IsString()
  updatedAt!: string;

  @IsOptional()
  @IsString()
  outcomeHash?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
