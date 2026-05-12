import { ChainCallDTO } from "@gala-chain/api";
import { IsUUID } from "class-validator";

/**
 * Read-only DTO for `getSession`, `getSessionEvents`, and `verifyIntegrity`.
 *
 * `ChainCallDTO` (vs `SubmitCallDTO`) — these methods are `@Evaluate` reads,
 * not `@Submit` writes. No state mutation, can be served from any peer.
 */
export class GetSessionDto extends ChainCallDTO {
  @IsUUID(4)
  sessionId!: string;
}
