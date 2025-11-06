import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PeriodType, ModeType } from '@/lib/types';
import { formatWeekLabel } from '@/lib/data-utils';

interface FilterBarProps {
  period: PeriodType;
  mode: ModeType;
  month: string;
  week: string;
  availableMonths: string[];
  availableWeeks: string[];
  onPeriodChange: (value: PeriodType) => void;
  onModeChange: (value: ModeType) => void;
  onMonthChange: (value: string) => void;
  onWeekChange: (value: string) => void;
}

export function FilterBar({
  period,
  mode,
  month,
  week,
  availableMonths,
  availableWeeks,
  onPeriodChange,
  onModeChange,
  onMonthChange,
  onWeekChange,
}: FilterBarProps) {
  const isWeekDisabled = month === '__ALL__' || availableWeeks.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <label>Period:</label>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_DATA">All Data</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label>Orders:</label>
        <Select value={mode} onValueChange={onModeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_ORDERS">All Orders</SelectItem>
            <SelectItem value="PAID_ONLY">Paid Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label>Month:</label>
        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">All months</SelectItem>
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label>Week:</label>
        <Select value={week} onValueChange={onWeekChange} disabled={isWeekDisabled}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Entire month</SelectItem>
            {availableWeeks.map((w) => (
              <SelectItem key={w} value={w}>
                {formatWeekLabel(w)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
