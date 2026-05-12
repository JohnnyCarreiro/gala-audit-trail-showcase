import { SubmitCallDTO } from "@gala-chain/api";
import { IsString, IsUUID, Matches } from "class-validator";

/**
 * DTO for `AuditTrailContract.finalizeSession`.
 *
 * `outcomeHash` must be a `0x`-prefixed 64-hex-char keccak256 digest of the
 * off-chain outcome data the studio committed to (e.g., final scores +
 * timeline + RNG seeds). Validated at the contract boundary; immutable
 * after persistence (Inv. 5).
 */
export class FinalizeSessionDto extends SubmitCallDTO {
  @IsUUID(4)
  sessionId!: string;

  @IsUUID(4)
  eventId!: string;

  @IsString()
  @Matches(/^0x[0-9a-f]{64}$/, { message: "outcomeHash must be 0x + 64 hex chars (keccak256)" })
  outcomeHash!: string;
}
