"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const normalizedStatus = status?.toLowerCase() || "unknown";

    const config = {
        pending: {
            label: "Pending",
            icon: Loader2,
            className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
            animate: true,
        },
        finalized: {
            label: "Finalized",
            icon: CheckCircle2,
            className: "bg-green-500/20 text-green-400 border-green-500/30",
            animate: false,
        },
        confirmed: {
            label: "Confirmed",
            icon: CheckCircle2,
            className: "bg-green-500/20 text-green-400 border-green-500/30",
            animate: false,
        },
        failed: {
            label: "Failed",
            icon: XCircle,
            className: "bg-red-500/20 text-red-400 border-red-500/30",
            animate: false,
        },
        orphaned: {
            label: "Orphaned",
            icon: XCircle,
            className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
            animate: false,
        },
        unknown: {
            label: "Unknown",
            icon: Clock,
            className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
            animate: false,
        },
    };

    const statusConfig = config[normalizedStatus as keyof typeof config] || config.unknown;
    const Icon = statusConfig.icon;

    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs font-medium gap-1",
                statusConfig.className,
                className
            )}
        >
            <Icon className={cn("h-3 w-3", statusConfig.animate && "animate-spin")} />
            {statusConfig.label}
        </Badge>
    );
}
