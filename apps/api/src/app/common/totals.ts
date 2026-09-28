import { BadRequestException } from '@nestjs/common';

export function calculateTotal(rows: ReadonlyArray<{ unitPriceMinor: number; quantity: number; currency: string }>) {
  const currency = rows[0]?.currency ?? null;
  if (rows.some((row) => row.currency !== currency)) throw new BadRequestException('Mixed currencies are unsupported');
  const totalMinor = rows.reduce((sum, row) => sum + row.unitPriceMinor * row.quantity, 0);
  if (!Number.isSafeInteger(totalMinor) || totalMinor > 2_147_483_647 || totalMinor < 0) {
    throw new BadRequestException('Total exceeds supported range');
  }
  return { totalMinor, currency };
}
