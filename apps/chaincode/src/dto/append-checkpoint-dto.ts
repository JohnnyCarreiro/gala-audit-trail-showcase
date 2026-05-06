import { SubmitCallDTO } from "@gala-chain/api";
import { IsObject, IsUUID } from "class-validator";

/**
 * DTO for `AuditTrailContract.appendCheckpoint`.
 *
 * `signedBy` and `signature` for the new SessionEvent are derived from the
 * SDK context — `ctx.callingUser` for the wallet identifier, and the
 * inherited `SubmitCallDTO.signature` for the cryptographic proof. The
 * `payload` is free-form game state for this checkpoint.
 */
export class AppendCheckpointDto extends SubmitCallDTO {
  @IsUUID(4)
  sessionId!: string;

  @IsUUID(4)
  eventId!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
