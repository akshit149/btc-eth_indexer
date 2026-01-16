"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Block } from "@/types";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface BlocksChartProps {
    btcBlocks: Block[];
    ethBlocks: Block[];
}

export function BlocksChart({ }: BlocksChartProps) {

    // Fallback to a simulated "System Load" or "Blocks Mined" over the last hour for demo
    // Since we don't have a backend endpoint for this history.
    const mockData = [
        { time: '10:00', btc: 4, eth: 25 },
        { time: '10:05', btc: 3, eth: 22 },
        { time: '10:10', btc: 5, eth: 28 },
        { time: '10:15', btc: 2, eth: 20 },
        { time: '10:20', btc: 6, eth: 30 },
        { time: '10:25', btc: 4, eth: 24 },
        { time: '10:30', btc: 5, eth: 26 },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Block Production (Last 30m)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockData}>
                        <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                        <Bar dataKey="btc" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="BTC Blocks" />
                        <Bar dataKey="eth" fill="#627EEA" radius={[4, 4, 0, 0]} name="ETH Blocks" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
