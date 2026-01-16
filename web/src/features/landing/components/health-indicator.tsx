"use client";

import { Badge } from "@/components/ui/badge";
import { getHealth } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";

interface HealthIndicatorProps {
    compact?: boolean;
}

export function HealthIndicator({ compact }: HealthIndicatorProps) {
    const { isLoading, isError } = useQuery({
        queryKey: ["health"],
        queryFn: getHealth,
        refetchInterval: 10000,
    });

    if (isLoading) {
        return (
            <Badge variant="outline" className={`gap-1 animate-pulse ${compact ? "border-none" : ""}`}>
                <Activity className="h-3 w-3" />
                {!compact && "Checking..."}
            </Badge>
        );
    }

    if (isError) {
        return (
            <Badge variant="destructive" className={`gap-1 ${compact ? "px-2" : ""}`}>
                <AlertCircle className="h-3 w-3" />
                {!compact && "System Offline"}
            </Badge>
        );
    }

    return (
        <Badge variant="default" className={`gap-1 bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20 ${compact ? "px-2" : ""}`}>
            <CheckCircle2 className="h-3 w-3" />
            {!compact && "System Operational"}
        </Badge>
    );
}
