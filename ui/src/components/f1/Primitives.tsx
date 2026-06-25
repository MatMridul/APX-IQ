import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export { cn };

interface CarbonPanelProps {
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    title?: string;
}

// Enhanced CarbonPanel with better flex handling for graphs
export function CarbonPanel({ children, className, contentClassName, title }: CarbonPanelProps) {
    return (
        <div className={cn(
            "relative bg-carbon border border-white/5 rounded-lg overflow-hidden flex flex-col group transition-all duration-300",
            "hover:border-gold/40 hover:shadow-[0_0_15px_rgba(207,163,73,0.1)]", // Hover glow
            className
        )}>
            {/* Top Gold Accent */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-50" />

            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/30" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/30" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/30" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/30" />

            {title && (
                <div className="px-3 py-1.5 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-silver/80">{title}</h3>
                    <div className="w-1.5 h-1.5 rounded-full bg-gold/50 animate-pulse shadow-[0_0_5px_rgba(207,163,73,0.8)]" />
                </div>
            )}

            {/* Content Container - Forces fill for Recharts */}
            <div className={cn("p-3 flex-1 flex flex-col relative z-10 min-h-0 w-full h-full", contentClassName)}>
                {children}
            </div>

            {/* Background Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '4px 4px' }}
            />
        </div>
    );
}

interface MetricValueProps {
    label: string;
    value: string | number;
    unit?: string;
    size?: "sm" | "md" | "lg" | "xl";
    color?: "white" | "gold" | "red" | "green" | "silver";
    className?: string;
}

export function MetricValue({ label, value, unit, size = "md", color = "white", className }: MetricValueProps) {
    const sizeClasses = {
        sm: "text-xl",
        md: "text-3xl",
        lg: "text-5xl",
        xl: "text-7xl"
    };

    const colorClasses = {
        white: "text-white",
        gold: "text-gold",
        red: "text-alert",
        green: "text-green-500",
        silver: "text-silver"
    };

    return (
        <div className={cn("flex flex-col", className)}>
            <span className="text-[10px] bg-white/10 w-fit px-1 rounded text-silver font-bold uppercase tracking-wider mb-1">{label}</span>
            <div className="flex items-baseline gap-1">
                <motion.span
                    key={String(value)}
                    initial={{ opacity: 0.8, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("font-mono font-bold leading-none tracking-tight", sizeClasses[size], colorClasses[color])}
                >
                    {value}
                </motion.span>
                {unit && <span className="text-sm text-silver/60 font-medium">{unit}</span>}
            </div>
        </div>
    );
}

export function BarGauge({ value, max = 100, color = "green", label, vertical = false }: { value: number, max?: number, color?: "green" | "red" | "gold", label?: string, vertical?: boolean }) {
    const percent = Math.min((value / max) * 100, 100);
    const colorClass = color === "green" ? "bg-green-500" : color === "red" ? "bg-alert" : "bg-gold";

    if (vertical) {
        return (
            <div className="h-full w-full flex flex-col items-center gap-1 relative">
                {/* Value Readout - Large and clear */}
                <div className="absolute top-2 w-full text-center z-10 pointer-events-none">
                    <span className="text-3xl font-mono font-black text-white drop-shadow-md">{Math.round(percent)}%</span>
                </div>

                {/* Main Gauge Container - NO PADDING to maximize thickness, removed border/bg to let bar pop */}
                <div className="flex-1 w-full bg-black/40 rounded p-0 relative border border-white/20 flex flex-col-reverse overflow-hidden">
                    {/* Background Grid/Ticks */}
                    <div className="absolute inset-x-0 top-0 bottom-0 z-20 flex flex-col justify-between py-1 px-0 pointer-events-none">
                        <div className="w-full h-[2px] bg-white shadow-[0_0_4px_rgba(255,255,255,1)]" />
                        <div className="w-full h-[1px] bg-white/50" />
                        <div className="w-full h-[1px] bg-white/80" />
                        <div className="w-full h-[1px] bg-white/50" />
                        <div className="w-full h-[2px] bg-white shadow-[0_0_4px_rgba(255,255,255,1)]" />
                    </div>

                    <motion.div
                        className={cn("w-full relative z-10",
                            color === "green" ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]" :
                                color === "red" ? "bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.6)]" :
                                    "bg-gold"
                        )}
                        initial={{ height: "0%" }}
                        animate={{ height: `${percent}%` }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                </div>
                {label && <span className="text-[10px] text-silver font-bold uppercase tracking-wider">{label}</span>}
            </div>
        )
    }

    return (
        <div className="w-full">
            {label && <div className="flex justify-between text-[10px] text-silver font-bold mb-1"><span>{label}</span><span>{Math.round(percent)}%</span></div>}
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/10">
                <motion.div
                    className={cn("h-full", colorClass)}
                    animate={{ width: `${percent}%` }}
                    transition={{ type: "tween", ease: "linear", duration: 0.05 }}
                />
            </div>
        </div>
    );
}
