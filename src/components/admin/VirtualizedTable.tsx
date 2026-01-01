/**
 * VirtualizedTable Component
 * 
 * Generic virtualized table for efficiently rendering large datasets.
 * Uses @tanstack/react-virtual for windowed rendering.
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableHeader, TableBody, TableHead, TableRow } from '@/components/ui/table';
import { VirtualizedTableRow } from './VirtualizedTableRow';
import { cn } from '@/lib/utils';

export interface ColumnDefinition<T> {
  key: keyof T | string;
  header: string;
  width?: number | string;
  minWidth?: number;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface VirtualizedTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ColumnDefinition<T>[];
  rowHeight?: number;
  maxHeight?: number;
  overscan?: number;
  getRowKey?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
}

export function VirtualizedTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowHeight = 48,
  maxHeight = 600,
  overscan = 5,
  getRowKey,
  onRowClick,
  emptyMessage = 'No data available',
  className,
  stickyHeader = true,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => rowHeight, [rowHeight]),
    overscan,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Calculate column widths
  const columnStyles = useMemo(() => {
    return columns.map(col => ({
      width: col.width,
      minWidth: col.minWidth || 50,
    }));
  }, [columns]);

  // Generate row key
  const generateRowKey = useCallback(
    (row: T, index: number): string => {
      if (getRowKey) return getRowKey(row, index);
      if ('id' in row) return String(row.id);
      return String(index);
    },
    [getRowKey]
  );

  if (data.length === 0) {
    return (
      <div className={cn('rounded-md border', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead
                  key={String(col.key)}
                  className={col.headerClassName}
                  style={{ width: columnStyles[i].width, minWidth: columnStyles[i].minWidth }}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border', className)}>
      {/* Sticky header */}
      {stickyHeader && (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead
                  key={String(col.key)}
                  className={col.headerClassName}
                  style={{ width: columnStyles[i].width, minWidth: columnStyles[i].minWidth }}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
      )}

      {/* Virtualized body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: maxHeight - (stickyHeader ? 40 : 0) }}
      >
        <Table>
          {!stickyHeader && (
            <TableHeader>
              <TableRow>
                {columns.map((col, i) => (
                  <TableHead
                    key={String(col.key)}
                    className={col.headerClassName}
                    style={{ width: columnStyles[i].width, minWidth: columnStyles[i].minWidth }}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {/* Spacer for items above viewport */}
            {virtualRows.length > 0 && virtualRows[0].start > 0 && (
              <tr style={{ height: virtualRows[0].start }} />
            )}
            
            {virtualRows.map((virtualRow: { index: number; start: number; end: number }) => {
              const row = data[virtualRow.index];
              const rowKey = generateRowKey(row, virtualRow.index);
              
              return (
                <VirtualizedTableRow
                  key={rowKey}
                  row={row}
                  columns={columns}
                  columnStyles={columnStyles}
                  rowIndex={virtualRow.index}
                  onClick={onRowClick}
                />
              );
            })}
            
            {/* Spacer for items below viewport */}
            {virtualRows.length > 0 && (
              <tr
                style={{
                  height:
                    totalSize -
                    virtualRows[virtualRows.length - 1].end,
                }}
              />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
