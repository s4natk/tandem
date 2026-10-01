import { customAlphabet } from "nanoid";

// Lowercase + digits, no easily-confused chars (0/o/1/l).
const ALPHA = "abcdefghjkmnpqrstuvwxyz23456789";
const generateBase = customAlphabet(ALPHA, 8);

/** Human-shareable join code, e.g. "k7m2x4qp". */
export function generateRoomCode(): string {
  return generateBase();
}
