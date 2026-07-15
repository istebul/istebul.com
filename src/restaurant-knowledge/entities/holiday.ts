/** Holiday / special closed day — often embedded in working_hours or settings jsonb. */
export interface Holiday {
  id: string;
  restaurantId: string;
  date: string;
  name?: string;
  closed?: boolean;
  open?: string;
  close?: string;
  note?: string;
}

export function createHoliday(
  partial: Partial<Holiday> & Pick<Holiday, 'id' | 'restaurantId' | 'date'>,
): Holiday {
  return {
    closed: true,
    ...partial,
  };
}
