"use client";

import { useRef, useState } from "react";
import { MessagesSquare, Dice5, Hourglass, Repeat } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn, getLabelFromValue } from "@/lib/utils";

interface MetricData {
  value: number | null;
  label: string;
}

interface GameplayMetricsCardsProps {
  interaction?: MetricData;
  luck?: MetricData;
  downtime?: MetricData;
  replayability?: MetricData;
  /**
   * "card" (default): seção com card próprio.
   * "embedded": só título + grid, para uso dentro de outro card (ex: Hero).
   * "dots": cards compactos com indicadores circulares, para o Hero mobile.
   */
  variant?: "card" | "embedded" | "dots";
}

const METRIC_CONFIG = {
  interaction: {
    name: "Interação",
    Icon: MessagesSquare,
    color: "bg-cyan-500",
    iconColor: "text-cyan-600",
    dotColor: "bg-[#06b6d4]",
    helpText: undefined,
  },
  luck: {
    name: "Sorte",
    Icon: Dice5,
    color: "bg-amber-500",
    iconColor: "text-amber-500",
    dotColor: "bg-[#f59e0b]",
    helpText: undefined,
  },
  downtime: {
    name: "Downtime",
    Icon: Hourglass,
    color: "bg-rose-500",
    iconColor: "text-red-500",
    dotColor: "bg-[#ef4444]",
    helpText: "Tempo que os jogadores passam sem tomar decisões ativas durante a partida.",
  },
  replayability: {
    name: "Rejogabilidade",
    Icon: Repeat,
    color: "bg-emerald-500",
    iconColor: "text-emerald-600",
    dotColor: "bg-[#10b981]",
    helpText: undefined,
  },
} as const;

type MetricKey = keyof typeof METRIC_CONFIG;

function HelpTooltip({
  label,
  helpText,
  buttonClassName,
  iconClassName,
}: {
  label: string;
  helpText: string;
  buttonClassName: string;
  iconClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const pointerDownRef = useRef(false);
  const wasOpenOnPointerDownRef = useRef(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        asChild
        onPointerDown={() => {
          pointerDownRef.current = true;
          wasOpenOnPointerDownRef.current = open;
        }}
        onKeyDown={() => {
          pointerDownRef.current = false;
        }}
        onClick={(event) => {
          if (!pointerDownRef.current) return;
          pointerDownRef.current = false;
          event.preventDefault();
          setOpen(!wasOpenOnPointerDownRef.current);
        }}
      >
        <button
          type="button"
          className={buttonClassName}
          aria-label={`Ajuda sobre ${label}`}
        >
          <svg
            className={iconClassName}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-xs text-left">
        <p className="text-sm text-[#0f172a]">{helpText}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function MetricCard({
  metricKey,
  data,
}: {
  metricKey: MetricKey;
  data: MetricData | undefined;
}) {
  const config = METRIC_CONFIG[metricKey];
  const Icon = config.Icon;
  const value = data?.value ?? null;
  const label = data?.label ?? (value !== null ? getLabelFromValue(value) : "Não avaliado");
  const filledSegments = value !== null ? Math.round(value) : 0;
  const displayValue = value !== null ? value.toFixed(1).replace(".", ",") : "—";

  const isUnrated = value === null;

  return (
    <div
      className={cn(
        "relative flex flex-col h-full rounded-xl border bg-white border-[#e2e8f0] shadow-sm transition-all duration-300",
        isUnrated ? "opacity-60" : ""
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f1f5f9]">
        <span className={cn("flex-shrink-0", config.iconColor)}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        <h4 className="font-semibold text-[#0f172a] text-sm flex-1 truncate">
          {config.name}
        </h4>
        {config.helpText && (
          <HelpTooltip
            label={config.name}
            helpText={config.helpText}
            buttonClassName="flex-shrink-0 p-1 rounded-full text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
            iconClassName="w-4 h-4"
          />
        )}
      </div>

      {/* Main Label */}
      <div className="flex-1 flex items-center justify-center px-4 py-2">
        <span className={cn(
          "text-center font-bold text-base tracking-tight transition-colors",
          isUnrated
            ? "text-[#64748b]"
            : "text-[#0f172a]"
        )}>
          {label}
        </span>
      </div>

      {/* Segmented Bar */}
      <div className="px-4 pb-3 flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-3 rounded-lg transition-all duration-300",
              i < filledSegments
                ? `${config.color} shadow-[0_0_8px_${config.color.replace("bg-", "")}]`
                : "bg-[#e2e8f0]"
            )}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 border-t border-[#f1f5f9] mt-auto">
        <span className={cn(
          "font-mono font-semibold text-xs",
          isUnrated
            ? "text-[#64748b]"
            : "text-[#0f172a]"
        )}>
          {displayValue}
        </span>
      </div>
    </div>
  );
}

/** Card compacto com 5 indicadores circulares — usado no Hero mobile. */
function MetricDotCard({
  metricKey,
  data,
}: {
  metricKey: MetricKey;
  data: MetricData | undefined;
}) {
  const config = METRIC_CONFIG[metricKey];
  const Icon = config.Icon;
  const value = data?.value ?? null;
  const label = data?.label ?? (value !== null ? getLabelFromValue(value) : "Não avaliado");
  const filledSegments = value !== null ? Math.round(value) : 0;
  const displayValue = value !== null ? value.toFixed(1).replace(".", ",") : "—";
  const isUnrated = value === null;

  return (
    <div
      className={cn(
        "flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm",
        isUnrated ? "opacity-60" : ""
      )}
    >
      {/* Header */}
      <div className="flex min-w-0 items-center justify-between gap-1.5 border-b border-[#f1f5f9] px-2.5 pb-1.5 pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon
            className={cn("h-3.5 w-3.5 shrink-0", config.iconColor)}
            aria-hidden="true"
          />
          <span className="whitespace-nowrap text-[11px] font-bold tracking-tight text-slate-700">
            {config.name}
          </span>
        </div>

        {config.helpText && (
          <HelpTooltip
            label={config.name}
            helpText={config.helpText}
            buttonClassName="shrink-0 p-0.5 text-slate-400 transition-colors hover:text-slate-600"
            iconClassName="h-3 w-3"
          />
        )}
      </div>

      {/* Nível + indicadores */}
      <div className="px-2.5 py-2 text-center">
        <p className="text-xs font-bold text-slate-800">{label}</p>

        <div
          className="mt-2 flex items-center justify-center gap-1.5"
          role="img"
          aria-label={`${config.name}: ${label} (${filledSegments} de 5)`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                i < filledSegments ? config.dotColor : "bg-slate-200"
              )}
            />
          ))}
        </div>
      </div>

      {/* Valor */}
      <div className="px-2.5 pb-2 pt-0.5 text-left text-[11px] font-bold text-slate-700">
        {displayValue}
      </div>
    </div>
  );
}

export function GameplayMetricsCards({
  interaction,
  luck,
  downtime,
  replayability,
  variant = "card",
}: GameplayMetricsCardsProps) {
  const metrics = [
    { key: "interaction" as MetricKey, data: interaction },
    { key: "luck" as MetricKey, data: luck },
    { key: "downtime" as MetricKey, data: downtime },
    { key: "replayability" as MetricKey, data: replayability },
  ];

  const hasAnyData = metrics.some((m) => m.data?.value !== null && m.data?.value !== undefined);

  if (!hasAnyData) {
    return null;
  }

  const content = (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ key, data }) =>
          data !== undefined && (
            <MetricCard key={key} metricKey={key} data={data} />
          )
        )}
      </div>
    </>
  );

  if (variant === "dots") {
    return (
      <div className="grid grid-cols-2 gap-2.5" data-purpose="gameplay-metrics">
        {metrics.map(
          ({ key, data }) =>
            data !== undefined && (
              <MetricDotCard key={key} metricKey={key} data={data} />
            )
        )}
      </div>
    );
  }

  if (variant === "embedded") {
    return (
      <div className="space-y-4" data-purpose="gameplay-metrics">
        {content}
      </div>
    );
  }

  return (
    <section className="bg-white border border-[#e2e0ea] rounded-xl p-5 shadow-sm space-y-4" data-purpose="gameplay-metrics">
      {content}
    </section>
  );
}