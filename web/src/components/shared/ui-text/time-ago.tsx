import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";

interface TimeAgoProps {
    timestamp: string | number | Date;
    withIcon?: boolean;
}

export function TimeAgo({ timestamp, withIcon = false }: TimeAgoProps) {
    if (!timestamp) return null;

    const date = new Date(timestamp);
    const timeString = formatDistanceToNow(date, { addSuffix: true });

    if (withIcon) {
        return (
            <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="whitespace-nowrap">{timeString}</span>
            </div>
        )
    }

    return (
        <span title={date.toLocaleString()}>
            {timeString}
        </span>
    );
}
