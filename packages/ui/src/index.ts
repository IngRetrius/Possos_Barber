/**
 * API pública de @possos/ui: tokens, formato y componentes del sistema de diseño (docs/11).
 * Sin dominio: ningún componente sabe de citas ni de clientes. Lo interno va en src/internal/.
 *
 * Los estilos se importan aparte, desde el CSS de la app: `@import "@possos/ui/styles.css";`.
 */

export { cn } from "./internal/cn";
export { submitKeepingValues } from "./internal/form";
export { colors, type ColorToken } from "./internal/tokens";
export {
  bogotaParts,
  dayPeriod,
  DAY_PERIOD_LABEL,
  formatDate,
  formatDateLong,
  formatDuration,
  formatMonthYear,
  formatPrice,
  formatTime,
  formatTimeRange,
  formatTimeShort,
  formatWeekdayShort,
  toDateKey,
  type BogotaParts,
  type DateInput,
  type DayPeriod,
} from "./internal/format";

export {
  BottomBar,
  TabBar,
  type BottomBarProps,
  type TabBarItem,
} from "./internal/components/bars";
export { Button, buttonVariants, type ButtonProps } from "./internal/components/button";
export {
  DateStrip,
  type DateStripDay,
  type DateStripProps,
} from "./internal/components/date-strip";
export {
  EmptyState,
  InlineError,
  Skeleton,
  StatusBadge,
  type EmptyStateProps,
  type InlineErrorProps,
  type StatusTone,
} from "./internal/components/feedback";
export {
  Checkbox,
  Field,
  Input,
  PhoneInput,
  Textarea,
  type CheckboxProps,
  type FieldProps,
} from "./internal/components/fields";
export { List, ListRow, type ListRowProps } from "./internal/components/list";
export { Logo, type LogoProps } from "./internal/components/logo";
export { Sheet, SheetClose, SheetTrigger, type SheetProps } from "./internal/components/sheet";
export { SlotGrid, SlotGridSkeleton, type SlotGridProps } from "./internal/components/slot-grid";
export { StepHeader, type StepHeaderProps } from "./internal/components/step-header";
export { Toaster, toast } from "./internal/components/toaster";
