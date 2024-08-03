import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, TooltipProps, ReferenceArea } from 'recharts';
import { format, parse, isWithinInterval, differenceInDays } from 'date-fns';
import { MoveDown, MoveUp, ChartNoAxesCombined } from 'lucide-react';







interface MarkerLineProps {
    marker: ImportantMarker;
    chartDimensions: { width: number; height: number };
    isSelected: boolean;
    onSelect: (marker: ImportantMarker) => void;
}

export interface DataPoint {
    name: string;
    uv: number;
    pv: number;
    amt: number;
}

export interface ImportantMarker {
    date: string;
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
    dragStart: DataPoint | null;
    dragEnd: DataPoint | null;
}



const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, percentageChange, dragStart, dragEnd }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;

        // Parse the date string and format it
        const date = parse(data.name, 'yyyy-MM-dd', new Date());
        const formattedDate = format(date, 'MMMM d, yyyy');

        let tooltipContent;
        if (percentageChange !== null && dragStart && dragEnd) {
            const startDate = parse(dragStart.name, 'yyyy-MM-dd', new Date());
            const endDate = parse(dragEnd.name, 'yyyy-MM-dd', new Date());
            const formattedStartDate = format(startDate, 'MMMM d, yyyy');
            const formattedEndDate = format(endDate, 'MMMM d, yyyy');

            const percentageChangeNum = parseFloat(percentageChange);
            const isPositive = percentageChangeNum >= 0;
            const color = isPositive ? 'text-green-500' : 'text-red-500';
            const Arrow = isPositive ? MoveUp : MoveDown;

            tooltipContent = (
                <>
                    <div className="flex flex-row gap-2 items-center">
                        <p className={`percentage-change font-bold ${color}`}>{`${percentageChange}`}</p>
                        <Arrow size={16} className={color} />
                        <p className="date-range text-sm">{`${formattedStartDate} - ${formattedEndDate}`}</p>
                    </div>

                </>
            );
        } else {
            tooltipContent = (
                <>
                    <div className="flex flex-row gap-2 items-center">
                        <p className="value font-bold">{`${data.uv.toFixed(2)} USD`}</p>
                        <p className="label italic">{formattedDate}</p>
                    </div>

                </>
            );
        }

        return (
            <div className="custom-tooltip flex flex-col gap-2 inline-block bg-white border-sky-300 border-2 rounded-lg px-4 py-2">
                {tooltipContent}
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

    const [selectedMarkerDate, setSelectedMarkerDate] = useState<string | null>(null);
    const [recentNewsDate, setRecentNewsDate] = useState<string>("Recent News");

    const MarkerLine: React.FC<MarkerLineProps> = ({ marker, chartDimensions, isSelected, onSelect }) => {
        const markerDate = parse(marker.date, 'yyyy-MM-dd', new Date());
        const startDate = parse(data[0].name, 'yyyy-MM-dd', new Date());
        const endDate = parse(data[data.length - 1].name, 'yyyy-MM-dd', new Date());

        const totalDays = differenceInDays(endDate, startDate);
        const markerDays = differenceInDays(markerDate, startDate);

        const xPosition = (markerDays / totalDays) * chartDimensions.width;

        const handleClick = () => {
            onSelect(marker);
            setSelectedMarkerDate(marker.date); // Update the selected marker date
        };

        const iconSize = 24; // Adjust as needed
        const clickableAreaSize = 40; // Larger than the icon for easier clicking


        return (
            <g onClick={handleClick} style={{ cursor: 'pointer' }}>
                {/* Invisible larger clickable area */}
                <rect
                    x={xPosition - clickableAreaSize / 2}
                    y={chartDimensions.height - 80 - (clickableAreaSize - iconSize) / 2}
                    width={clickableAreaSize}
                    height={clickableAreaSize}
                    fill="transparent"
                />

                {/* Visible icon */}
                <ChartNoAxesCombined
                    x={xPosition - iconSize / 2}
                    y={chartDimensions.height - 80}
                    size={iconSize}
                    color={isSelected ? '#3b82f6' : '#888'}
                />
            </g>
        );
    };
    const [dragStart, setDragStart] = useState<DataPoint | null>(null);
    const [dragEnd, setDragEnd] = useState<DataPoint | null>(null);
    const [percentageChange, setPercentageChange] = useState<string | null>(null);
    const [chartDimensions, setChartDimensions] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState<ImportantMarker | null>(null);

    useEffect(() => {
        if (!selectedMarkerDate) {
            // Here you would typically fetch the most recent news date
            // For now, we'll just set it to "Recent News"
            setRecentNewsDate("Recent News");
        }
    }, [selectedMarkerDate]);

    const handleMarkerSelect = (marker: ImportantMarker) => {
        if (selectedMarker === marker) {
            setSelectedMarker(null);
            setSelectedMarkerDate(null);
        } else {
            setSelectedMarker(marker);
            setSelectedMarkerDate(marker.date);
        }
    };


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
                    margin={{ top: 0, right: 0, left: 0, bottom: 30 }}
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
                    <svg>
                        {importantMarkers.map((marker, index) => (
                            <MarkerLine
                                key={index}
                                marker={marker}
                                chartDimensions={chartDimensions}
                                isSelected={marker === selectedMarker}
                                onSelect={handleMarkerSelect}
                            />
                        ))}
                    </svg>
                    <Tooltip
                        content={<CustomTooltip
                            percentageChange={percentageChange}
                            dragStart={dragStart}
                            dragEnd={dragEnd}
                        />}
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
                    <h1 className="text-black">yo</h1>


                </AreaChart>
            </ResponsiveContainer>

        </div>
    );
}

export default CustomGraph;