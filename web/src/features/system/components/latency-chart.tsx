"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export function LatencyChart() {
    // Simulated API Latency Data
    const data = [
        { time: '0s', latency: 45 },
        { time: '5s', latency: 42 },
        { time: '10s', latency: 48 },
        { time: '15s', latency: 40 },
        { time: '20s', latency: 55 },
        { time: '25s', latency: 38 },
        { time: '30s', latency: 42 },
        { time: '35s', latency: 44 },
        { time: '40s', latency: 41 },
        { time: '45s', latency: 39 },
        { time: '50s', latency: 43 },
        { time: '55s', latency: 40 },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>API Latency (ms)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            cursor={{ stroke: 'hsl(var(--muted-foreground))' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                        />
                        <Area type="monotone" dataKey="latency" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
