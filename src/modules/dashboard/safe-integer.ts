export function bigintToSafeInteger(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new Error("O total agregado ultrapassa o limite numérico seguro.");
  }
  return result;
}
