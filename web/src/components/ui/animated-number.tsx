"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    className?: string;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    separator?: string;
}

export function AnimatedNumber({
    value,
    duration = 1000,
    className,
    prefix = "",
    suffix = "",
    decimals = 0,
    separator = ",",
}: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const previousValue = useRef(value);
    const animationRef = useRef<number>();

    useEffect(() => {
        const startValue = previousValue.current;
        const endValue = value;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const currentValue = startValue + (endValue - startValue) * easeOut;
            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                previousValue.current = endValue;
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration]);

    const formatNumber = (num: number) => {
        const fixed = num.toFixed(decimals);
        const [integer, decimal] = fixed.split(".");
        const withSeparator = integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
        return decimal ? `${withSeparator}.${decimal}` : withSeparator;
    };

    return (
        <span className={cn("tabular-nums font-mono tracking-tight", className)}>
            {prefix}
            {formatNumber(displayValue)}
            {suffix}
        </span>
    );
}

// Compact version for inline use
export function AnimatedCounter({
    value,
    className,
}: {
    value: number;
    className?: string;
}) {
    return (
        <AnimatedNumber
            value={value}
            duration={800}
            className={className}
            decimals={0}
        />
    );
}
