import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useVirtualGrid } from '../../hooks/useVirtualGrid';
import { useBookingStore } from '../../store/useBookingStore';
import { useBookingsQuery, useTherapistsQuery } from '../../hooks/useBookings';
import { useAuthBootstrap } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import {
  applyRescheduleToBookings,
  bookingMatchesSelectedDay,
  buildCalendarModel,
  filterBookingsForViewport,
  addMinutesToTimeString,
  rowIndexToTimeString,
  therapistDisplayName,
} from '../../utils/helpers';
import { FEMALE_COLOR, MALE_COLOR } from '../../utils/constants';
import { DraggableBookingBlock } from './DraggableBookingBlock';

const TIME_COLUMN_WIDTH = 96;
const CALENDAR_START_HOUR = 8;
const CALENDAR_END_HOUR = 23;

function formatHourLabelFigma(hour24) {
  const h = ((hour24 % 24) + 24) % 24;
  const isAM = h < 12;
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h === 12 ? 12 : h;
  return `${String(display).padStart(2, '0')}.00 ${isAM ? 'AM' : 'PM'}`;
}

export const VirtualCalendar = () => {
  const queryClient = useQueryClient();
  const { ready, authError } = useAuthBootstrap();
  const selectedDate = useBookingStore((s) => s.selectedDate);
  const outletId = useBookingStore((s) => s.outletId);
  const searchQuery = useBookingStore((s) => s.searchQuery);
  const debouncedSearch = useDebounce(searchQuery, 250);
  const openSidebar = useBookingStore((s) => s.openSidebar);

  const { data: bookings = [], isLoading, isError, error } = useBookingsQuery({
    outletId,
    selectedDate,
    enabled: ready && !authError,
  });

  const { data: therapists = [] } = useTherapistsQuery({
    outletId,
    selectedDate,
    enabled: ready && !authError,
  });

  const dayBookings = useMemo(
    () => (bookings || []).filter((b) => bookingMatchesSelectedDay(b, selectedDate)),
    [bookings, selectedDate],
  );

  const filteredBookings = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return dayBookings;
    return dayBookings.filter((b) => {
      const name = String(b.customer_name || '').toLowerCase();
      const phone = String(b.mobile_number || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [dayBookings, debouncedSearch]);

  const { columnTherapists: therapistColumns, blocks } = useMemo(
    () => buildCalendarModel(filteredBookings, therapists, CALENDAR_START_HOUR),
    [filteredBookings, therapists],
  );

  const columnTherapists = useMemo(() => {
    const min = 12;
    const base = [...therapistColumns];
    while (base.length < min) {
      base.push({
        id: `placeholder-${base.length}`,
        therapist_id: null,
        alias: '—',
        gender: 'female',
      });
    }
    return base;
  }, [therapistColumns]);

  const colCount = columnTherapists.length;
  const { rowCount, colWidth, rowHeight, startHour } = useVirtualGrid({
    colCount,
    startHour: CALENDAR_START_HOUR,
    endHour: CALENDAR_END_HOUR,
  });

  const gridRef = useRef(null);
  const containerRef = useRef(null);
  const didAutoScrollRef = useRef(false);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    didAutoScrollRef.current = false;
  }, [selectedDate, filteredBookings.length]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const apply = (width, height) => {
      if (width > 0 && height > 0) setGridSize({ width, height });
    };

    const measure = () => {
      const r = el.getBoundingClientRect();
      apply(r.width, r.height);
    };

    measure();
    const id = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
    });

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      apply(width, height);
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [ready, isLoading, isError]);

  useEffect(() => {
    if (!blocks.length || didAutoScrollRef.current || !gridRef.current) return;
    const minRow = Math.min(...blocks.map((b) => b.rowStart));
    const grid = gridRef.current;
    if (typeof grid.scrollTo === 'function') {
      const target = Math.max(0, minRow * rowHeight - rowHeight * 3);
      requestAnimationFrame(() => {
        grid.scrollTo({ scrollTop: target });
        setScrollTop(target);
      });
      didAutoScrollRef.current = true;
    }
  }, [blocks, rowHeight, selectedDate]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = useCallback(
    (event) => {
      const { active, delta } = event;
      if (!active?.id || !delta) return;
      const block = blocks.find((b) => b.key === active.id);
      if (!block) return;

      const colShift = Math.round(delta.x / colWidth);
      const rowShift = Math.round(delta.y / rowHeight);

      let newCol = block.therapistIndex + colShift;
      if (newCol < 0) newCol = 0;
      if (newCol >= colCount) newCol = colCount - 1;

      let newRow = block.rowStart + rowShift;
      if (newRow < 0) newRow = 0;
      if (newRow > rowCount - 1) newRow = rowCount - 1;

      const therapist = columnTherapists[newCol];
      const therapistId = therapist?.therapist_id ?? therapist?.id;
      if (therapistId == null) {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        return;
      }

      const newStart = rowIndexToTimeString(newRow, startHour);
      const newEnd = addMinutesToTimeString(newStart, block.duration);

      const key = ['bookings', outletId, format(selectedDate, 'yyyy-MM-dd')];

      queryClient.setQueryData(key, (old) =>
        applyRescheduleToBookings(old, block.bookingId, block.itemId, {
          therapist_id: therapistId,
          therapist: therapist?.alias || therapist?.therapist,
          start_time: newStart,
          end_time: newEnd,
        }),
      );

      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    [blocks, colCount, colWidth, columnTherapists, outletId, queryClient, rowCount, rowHeight, selectedDate, startHour],
  );

  const visibleBlocks = useMemo(() => {
    if (!gridSize.width || !gridSize.height) return [];
    if (blocks.length <= 500) return blocks;

    const colStart = Math.max(0, Math.floor(scrollLeft / colWidth) - 3);
    const colEnd = Math.min(
      colCount - 1,
      Math.ceil((scrollLeft + gridSize.width) / colWidth) + 3,
    );
    const rowStart = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
    const rowEnd = Math.min(
      rowCount - 1,
      Math.ceil((scrollTop + gridSize.height) / rowHeight) + 6,
    );
    return filterBookingsForViewport(blocks, { colStart, colEnd, rowStart, rowEnd });
  }, [blocks, colCount, colWidth, gridSize.height, gridSize.width, rowCount, rowHeight, scrollLeft, scrollTop]);

  const handleOpenBooking = useCallback(
    (b) => {
      openSidebar('view', b.bookingId, b.itemId);
    },
    [openSidebar],
  );

  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }) => {
      const isHourLine = rowIndex % 4 === 0;
      return (
        <div
          style={{ ...style, boxSizing: 'border-box' }}
          className={`border-r border-gray-200 cursor-pointer hover:bg-blue-50/40 transition-colors border-t ${
            isHourLine ? 'border-gray-300' : 'border-gray-100'
          }`}
          onClick={() => openSidebar('create')}
          role="presentation"
        />
      );
    },
    [openSidebar],
  );

  const innerElementType = useMemo(() => {
    const Cmp = React.forwardRef(({ style, children, ...rest }, ref) => (
      <div ref={ref} style={{ ...style, position: 'relative' }} {...rest}>
        {children}
        {visibleBlocks.map((b) => (
          <DraggableBookingBlock
            key={b.key}
            booking={b}
            colWidth={colWidth}
            rowHeight={rowHeight}
            startHour={startHour}
            onOpen={handleOpenBooking}
          />
        ))}
      </div>
    ));
    Cmp.displayName = 'CalendarInner';
    return Cmp;
  }, [visibleBlocks, colWidth, rowHeight, startHour, handleOpenBooking]);

  const hourSlots = useMemo(() => {
    const n = rowCount / 4;
    return Array.from({ length: n }, (_, i) => CALENDAR_START_HOUR + i);
  }, [rowCount]);

  if (authError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-red-700">
        Unable to sign in. Check network and credentials.
      </div>
    );
  }

  if (!ready || isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 text-sm">Loading schedule…</div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-red-700">
        {error?.message || 'Failed to load bookings.'}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="relative w-full h-full flex flex-col bg-white overflow-hidden text-sm">
        <div className="flex border-b border-gray-200 bg-white shadow-sm z-30 shrink-0 select-none">
          <div
            style={{ width: TIME_COLUMN_WIDTH, minWidth: TIME_COLUMN_WIDTH }}
            className="shrink-0 border-r border-gray-200 bg-white px-2 py-3 flex items-center justify-center"
          >
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Time</span>
          </div>
          <div className="flex-1 overflow-hidden relative bg-white min-w-0">
            <div
              className="flex h-[72px] absolute left-0 top-0"
              style={{ transform: `translateX(-${scrollLeft}px)`, width: colCount * colWidth }}
            >
              {Array.from({ length: colCount }).map((_, idx) => {
                const t = columnTherapists[idx];
                const label = t ? therapistDisplayName(t) : '—';
                const gender = String(t?.gender || '').toLowerCase();
                const badgeBg = gender === 'male' ? MALE_COLOR : FEMALE_COLOR;
                const showGender = gender === 'male' ? 'Male' : 'Female';
                return (
                  <div
                    key={t?.id ?? `pad-${idx}`}
                    style={{ width: colWidth }}
                    className="shrink-0 border-r border-gray-200 px-2 py-2 flex flex-col items-center justify-center bg-white hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-1.5 max-w-full">
                      <span
                        className="w-6 h-6 rounded-full text-white text-[10px] flex items-center justify-center shadow-sm shrink-0"
                        style={{ backgroundColor: badgeBg }}
                      >
                        {(t?.therapist_id ?? t?.id ?? idx + 1) % 1000}
                      </span>
                      <span className="font-bold text-xs text-gray-800 truncate text-center leading-tight">{label}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-1">
                      {t ? showGender : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative min-h-0">
          <div
            style={{ width: TIME_COLUMN_WIDTH, minWidth: TIME_COLUMN_WIDTH }}
            className="shrink-0 border-r border-gray-200 bg-[#fafafa] z-20 select-none relative overflow-hidden"
          >
            <div
              style={{
                transform: `translateY(-${scrollTop}px)`,
                height: rowCount * rowHeight,
                width: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              className="flex flex-col"
            >
              {hourSlots.map((hour24, i) => (
                <div
                  key={hour24}
                  style={{ height: rowHeight * 4 }}
                  className="border-b border-gray-200 pl-2 pr-1 pt-1.5 flex flex-col items-start justify-start bg-[#fafafa] shrink-0"
                >
                  <span className="text-[12px] font-bold text-gray-600 leading-none tabular-nums">
                    {formatHourLabelFigma(hour24)}
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium mt-1.5 leading-tight">23F 25M</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 relative bg-white min-w-0" ref={containerRef}>
            {gridSize.width > 0 && gridSize.height > 0 && (
              <Grid
                ref={gridRef}
                columnCount={colCount}
                columnWidth={colWidth}
                rowCount={rowCount}
                rowHeight={rowHeight}
                width={gridSize.width}
                height={gridSize.height}
                innerElementType={innerElementType}
                onScroll={({ scrollLeft: sl, scrollTop: st }) => {
                  setScrollLeft(sl);
                  setScrollTop(st);
                }}
              >
                {Cell}
              </Grid>
            )}
          </div>
        </div>

        {!isLoading && dayBookings.length > 0 && blocks.length === 0 ? (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 shadow-sm max-w-md text-center">
            {dayBookings.length} booking(s) for this day could not be placed on the grid. Check line items for time and
            therapist data.
          </div>
        ) : null}
        {!isLoading && bookings.length > 0 && dayBookings.length === 0 ? (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 rounded-md bg-sky-50 border border-sky-200 px-3 py-2 text-xs text-sky-900 shadow-sm max-w-md text-center">
            No bookings on {format(selectedDate, 'EEE, MMM d')}. Use the arrows or calendar to open the date that matches
            your booking (e.g. 28 Mar 2026).
          </div>
        ) : null}
      </div>
    </DndContext>
  );
};
