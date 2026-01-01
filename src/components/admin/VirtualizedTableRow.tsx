/**
 * VirtualizedTableRow Component
 * 
 * Memoized row component for VirtualizedTable.
 * Renders individual cells with proper styling.
 */

import React, { memo, useCallback } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ColumnDefinition } from './VirtualizedTable';

interface VirtualizedTableRowProps<T extends Record<string, unknown>> {
  row: T;
  columns: ColumnDefinition<T>[];
  columnStyles: Array<{ width?: number | string; minWidth: number }>;
  rowIndex: number;
  onClick?: (row: T, index: number) => void;
}

function VirtualizedTableRowComponent<T extends Record<string, unknown>>({
  row,
  columns,
  columnStyles,
  rowIndex,
  onClick,
}: VirtualizedTableRowProps<T>) {
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(row, rowIndex);
    }
  }, [onClick, row, rowIndex]);

  const getCellValue = (row: T, key: keyof T | string): unknown => {
    // Handle nested keys like "user.name"
    if (typeof key === 'string' && key.includes('.')) {
      const parts = key.split('.');
      let value: unknown = row;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return value;
    }
    return row[key as keyof T];
  };

  const renderCellContent = (
    col: ColumnDefinition<T>,
    value: unknown
  ): React.ReactNode => {
    if (col.render) {
      return col.render(value, row, rowIndex);
    }
    
    // Default rendering
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  return (
    <TableRow
      className={cn(
        onClick && 'cursor-pointer hover:bg-muted/50 transition-colors',
        rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'
      )}
      onClick={onClick ? handleClick : undefined}
    >
      {columns.map((col, colIndex) => {
        const value = getCellValue(row, col.key);
        
        return (
          <TableCell
            key={String(col.key)}
            className={cn('py-2', col.className)}
            style={{
              width: columnStyles[colIndex].width,
              minWidth: columnStyles[colIndex].minWidth,
            }}
          >
            {renderCellContent(col, value)}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

// Memoize with proper type handling
export const VirtualizedTableRow = memo(VirtualizedTableRowComponent) as typeof VirtualizedTableRowComponent;
