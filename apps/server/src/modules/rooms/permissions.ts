import type { MembershipRole } from "@collab/shared";
import { ForbiddenError } from "../../errors/index.js";

/** Owners and editors can change a board. Viewers can only read it. */
export function assertRoomEditor(role: MembershipRole): void {
  if (role === "VIEWER") {
    throw new ForbiddenError(
      "Viewers can view this board, but only editors can change it",
    );
  }
}
