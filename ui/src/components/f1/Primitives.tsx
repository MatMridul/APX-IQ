import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CarbonPanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

// Enhanced CarbonPanel with better flex handling for graphs
export function CarbonPanel({ children, className, title }: CarbonPanelProps) {
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
            <div className="p-3 flex-1 flex flex-col relative z-10 min-h-0">
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
            <div className="h-full w-full flex flex-col items-center gap-2">
                <div className="flex-1 w-full bg-black/40 rounded-sm p-1 relative border border-white/10">
                    <motion.div
                        className={cn("w-full rounded-sm absolute bottom-1 left-1 right-1", colorClass)}
                        style={{ height: `${percent}%` }} // Simplified, ignoring padding for now
                        animate={{ height: `${percent}%` }}
                        transition={{ type: "tween", ease: "linear", duration: 0.1 }}
                    />
                </div>
                {label && <span className="text-[10px] text-silver font-bold">{label}</span>}
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
