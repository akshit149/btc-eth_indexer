import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    variant?: "default" | "elevated" | "subtle" | "glow-btc" | "glow-eth";
    hover?: boolean;
    onClick?: () => void;
}

export function GlassCard({
    children,
    className,
    variant = "default",
    hover = true,
    onClick,
}: GlassCardProps) {
    const baseStyles = "rounded-xl transition-all duration-300 ease-out";

    const variants = {
        default: "bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg shadow-black/5",
        elevated: "bg-white/[0.08] backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        subtle: "bg-white/[0.02] backdrop-blur-md border border-white/[0.05]",
        "glow-btc": "bg-card/80 backdrop-blur-xl border border-btc/30 shadow-[0_0_30px_-5px_hsl(28_90%_50%_/_0.25)]",
        "glow-eth": "bg-card/80 backdrop-blur-xl border border-eth/30 shadow-[0_0_30px_-5px_hsl(224_76%_58%_/_0.25)]",
    };

    const hoverStyles = hover
        ? "hover:border-border/80 hover:shadow-xl hover:shadow-black/10 hover:translate-y-[-2px]"
        : "";

    return (
        <div
            className={cn(
                baseStyles,
                variants[variant],
                hoverStyles,
                onClick && "cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

// Specialized card variants
export function StatCard({
    label,
    value,
    icon,
    trend,
    className,
}: {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    trend?: { value: number; label: string };
    className?: string;
}) {
    return (
        <GlassCard className={cn("p-4", className)}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <div className="text-2xl font-bold font-mono tracking-tight">
                        {value}
                    </div>
                    {trend && (
                        <p
                            className={cn(
                                "text-xs font-medium",
                                trend.value >= 0 ? "text-green-500" : "text-red-500"
                            )}
                        >
                            {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
                        {icon}
                    </div>
                )}
            </div>
        </GlassCard>
    );
}

export function PulseCard({
    children,
    className,
    pulseColor = "primary",
}: {
    children: ReactNode;
    className?: string;
    pulseColor?: "primary" | "btc" | "eth" | "success";
}) {
    const pulseColors = {
        primary: "bg-primary/20",
        btc: "bg-btc/20",
        eth: "bg-eth/20",
        success: "bg-green-500/20",
    };

    return (
        <GlassCard className={cn("relative overflow-hidden", className)}>
            <div
                className={cn(
                    "absolute inset-0 animate-pulse opacity-50",
                    pulseColors[pulseColor]
                )}
            />
            <div className="relative z-10">{children}</div>
        </GlassCard>
    );
}
