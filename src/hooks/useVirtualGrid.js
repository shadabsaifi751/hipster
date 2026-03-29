import { useMemo } from 'react';

export function useVirtualGrid({ colCount, startHour = 9, endHour = 22 }) {
  const totalHours = endHour - startHour;
  const rowCount = totalHours * 4;
  const colWidth = 150;
  const rowHeight = 25;

  return useMemo(
    () => ({
      rowCount,
      colCount,
      colWidth,
      rowHeight,
      startHour,
      totalHours,
    }),
    [rowCount, colCount, colWidth, rowHeight, startHour, totalHours],
  );
}
