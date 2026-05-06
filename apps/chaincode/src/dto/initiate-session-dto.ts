import { SubmitCallDTO } from "@gala-chain/api";
import { ArrayMinSize, IsArray, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

/**
 * DTO for `AuditTrailContract.initiateSession`.
 *
 * The contract layer derives:
 *   - `signedBy`  → from `ctx.callingUser` (SDK auto-verifies the DTO sig)
 *   - `timestamp` → from `ctx.stub.getTxTimestamp()` (deterministic chain time)
 *
 * So the DTO carries only caller-controlled data. The framework-level
 * signature is on the inherited `SubmitCallDTO.signature` field.
 */
export class InitiateSessionDto extends SubmitCallDTO {
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

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
