import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, TooltipProps } from 'recharts';

export interface DataPoint {
    name: string;
    uv: number;
    pv: number;
    amt: number;
}

export interface ImportantMarker {
    x: string;
    label: string;
    explanation: string;
}

interface CustomGraphProps {
    data: DataPoint[];
    height: string | number;
    width: string | number;
    gradientColor: string;
    importantMarkers: ImportantMarker[];
    hideXaxis?: boolean;
    hideYaxis?: boolean;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    percentageChange: string | null;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, percentageChange }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-tooltip inline-block bg-white border-sky-300 border-2 rounded-lg px-4 py-2">
                <p className="label font-bold">{`Date: ${data.name}`}</p>
                <p className="value">{`Value: $${data.uv.toFixed(2)}`}</p>
                <p className="pv">{`PV: ${data.pv}`}</p>
                <p className="amt">{`AMT: ${data.amt}`}</p>
                {percentageChange !== null && (
                    <p className="percentage-change">{`Change: ${percentageChange}`}</p>
                )}
            </div>
        );
    }

    return null;
};


const CustomGraph: React.FC<CustomGraphProps> = ({
    data,
    height,
    width,
    gradientColor,
    importantMarkers,
    hideXaxis = false,
    hideYaxis = false
}) => {
    const [dragStart, setDragStart] = useState<DataPoint | null>(null);
    const [dragEnd, setDragEnd] = useState<DataPoint | null>(null);
    const [percentageChange, setPercentageChange] = useState<string | null>(null);
    const [chartDimensions, setChartDimensions] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback((chartState: any) => {
        if (chartState && chartState.activePayload && chartState.activePayload[0]) {
            const startPoint = chartState.activePayload[0].payload;
            setDragStart(startPoint);
            setDragEnd(null);
            setPercentageChange(null);
            setIsDragging(true);
            setSelectedRange({ start: data.findIndex(item => item.name === startPoint.name), end: -1 });
        }
    }, [data]);

    const handleMouseMove = useCallback((movePoint: any) => {
        if (isDragging && dragStart && movePoint && movePoint.activePayload && movePoint.activePayload[0]) {
            const currentPoint = movePoint.activePayload[0].payload;
            setDragEnd(currentPoint);

            const startIndex = data.findIndex(item => item.name === dragStart.name);
            const endIndex = data.findIndex(item => item.name === currentPoint.name);

            const [startPoint, endPoint] = startIndex <= endIndex
                ? [dragStart, currentPoint]
                : [currentPoint, dragStart];

            setSelectedRange({ start: Math.min(startIndex, endIndex), end: Math.max(startIndex, endIndex) });

            const startValue = startPoint.uv;
            const endValue = endPoint.uv;

            if (typeof startValue === 'number' && typeof endValue === 'number') {
                if (startValue !== 0) {
                    const change = ((endValue - startValue) / Math.abs(startValue)) * 100;
                    setPercentageChange(change.toFixed(2) + '%');
                } else if (endValue !== 0) {
                    setPercentageChange('∞%');
                } else {
                    setPercentageChange('0%');
                }
            } else {
                setPercentageChange('N/A');
            }
        }
    }, [isDragging, dragStart, data]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        setPercentageChange(null);
        setSelectedRange(null);
    }, []);





    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setChartDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);


    useEffect(() => {
        console.log('Data:', data);
        console.log('Important Markers:', importantMarkers);
    }, [data, importantMarkers]);

    const getHighlightColor = () => {
        if (percentageChange === null) return gradientColor;
        const percentageChangeNumber = parseFloat(percentageChange);
        return (percentageChangeNumber >= 0) ? '#4CAF50' : '#F44336'; // Green for positive, Red for negative
    };

    return (
        <div ref={containerRef} style={{ width, height, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fadedColorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="highlightGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={getHighlightColor()} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={getHighlightColor()} stopOpacity={0} />
                        </linearGradient>
                        {selectedRange && (
                            <clipPath id="selectedClip">
                                <rect x={`${(selectedRange.start / (data.length - 1)) * 100}%`}
                                    y="0"
                                    width={`${((selectedRange.end - selectedRange.start) / (data.length - 1)) * 100}%`}
                                    height="100%" />
                            </clipPath>
                        )}
                    </defs>
                    <Tooltip
                        content={<CustomTooltip percentageChange={percentageChange} />}
                        cursor={{ stroke: '#ccc', strokeWidth: 1 }}
                    />
                    {!hideXaxis && <XAxis dataKey="name" />}
                    {!hideYaxis && <YAxis />}
                    <Area
                        type="monotone"
                        dataKey="uv"
                        stroke={gradientColor}
                        fillOpacity={1}
                        fill="url(#fadedColorUv)"
                    />
                    {selectedRange && (
                        <Area
                            type="monotone"
                            dataKey="uv"
                            stroke={getHighlightColor()}
                            fillOpacity={1}
                            fill="url(#highlightGradient)"
                            clipPath="url(#selectedClip)"
                            isAnimationActive={false} // Add this line

                        />
                    )}
                    {dragStart && isDragging && <ReferenceLine x={dragStart.name} stroke="#8884d8" />}
                    {dragEnd && isDragging && <ReferenceLine x={dragEnd.name} stroke="#8884d8" />}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export default CustomGraph;