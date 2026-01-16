"use client";

import { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    className?: string;
    prefix?: string;
}

export function AnimatedCounter({ value, duration = 1000, className, prefix = "" }: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValue = useRef(0);

    useEffect(() => {
        const startValue = previousValue.current;
        const diff = value - startValue;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);

            const currentValue = Math.round(startValue + diff * eased);
            setDisplayValue(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                previousValue.current = value;
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return (
        <span className={className}>
            {prefix}{displayValue.toLocaleString()}
        </span>
    );
}
