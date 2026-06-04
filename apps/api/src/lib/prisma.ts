import { PrismaClient } from "@prisma/client";

// Allow BigInt values (e.g. file_size) to be serialized by res.json().
// Without this, Express throws "Do not know how to serialize a BigInt".
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this as unknown as bigint);
};

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
