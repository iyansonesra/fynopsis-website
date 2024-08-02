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

const CustomTooltip: React.FC<TooltipProps<number, string> & { importantMarkers: ImportantMarker[], percentageChange: string | null }> =
    ({ active, payload, label, importantMarkers, percentageChange }) => {
        console.log('CustomTooltip called:', { active, payload, label, importantMarkers, percentageChange });

        if (active && payload && payload.length && payload[0] && payload[0].value !== undefined) {
            const marker = importantMarkers.find(m => m.x === label);
            return (
                <div className="custom-tooltip" style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
                    <p>{`${label} : ${typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}`}</p>
                    {marker && <p>{marker.explanation}</p>}
                    {percentageChange && <p>{`Percentage Change: ${percentageChange}`}</p>}
                </div>
            );
        }
        return null;
    };




const CustomMarkers: React.FC<{
    data: DataPoint[],
    importantMarkers: ImportantMarker[],
    width: number,
    height: number
}> = ({ data, importantMarkers, width, height }) => {
    const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

    const getXPosition = (markerX: string) => {
        const index = data.findIndex(point => point.name === markerX);
        return (index / (data.length - 1)) * width;
    };

    const handleMarkerClick = (markerId: string) => {
        setSelectedMarker(prev => prev === markerId ? null : markerId);
    };

    return (
        <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
            {importantMarkers.map((marker, index) => {
                const x = getXPosition(marker.x);
                const isSelected = selectedMarker === marker.x;
                return (
                    <g key={index}>
                        <line x1={x} y1={0} x2={x} y2={height - 25} stroke="rgb(0,0,0,.3)" strokeDasharray="3 3" />
                        <circle
                            cx={x}
                            cy={height - 15}
                            r={15}
                            fill={isSelected ? "#3295C0" : "white"}
                            stroke={isSelected ? "#3295C0" : "black"}
                            strokeWidth={1}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleMarkerClick(marker.x)}
                        />
                        <text
                            x={x}
                            y={height - 8}
                            textAnchor="middle"
                            fill={isSelected ? "white" : "black"}
                            style={{ cursor: 'pointer', fontSize: '30px', userSelect: 'none' }}
                            onClick={() => handleMarkerClick(marker.x)}
                        >
                            +
                        </text>
                    </g>
                );
            })}
        </svg>
    );
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
    const [startPoint, setStartPoint] = useState<DataPoint | null>(null);
    const [endPoint, setEndPoint] = useState<DataPoint | null>(null);
    const [percentageChange, setPercentageChange] = useState<string | null>(null);
    const [chartDimensions, setChartDimensions] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);

    const handleMouseDown = useCallback((data: any) => {
        if (data && data.activePayload && data.activePayload[0]) {
            const index = data.activeTooltipIndex;
            setStartPoint(data.activePayload[0].payload);
            setSelectedRange({ start: index, end: index });
            setEndPoint(null);
            setPercentageChange(null);
        }
    }, []);

    const handleMouseMove = useCallback((movePoint: any) => {
        if (startPoint && movePoint && movePoint.activePayload && movePoint.activePayload[0]) {
            const endPoint = movePoint.activePayload[0].payload;
            const endIndex = movePoint.activeTooltipIndex;
            setEndPoint(endPoint);
            setSelectedRange(prev => prev ? { ...prev, end: endIndex } : null);

            const startValue = startPoint.uv;
            const endValue = endPoint.uv;

            if (typeof startValue === 'number' && typeof endValue === 'number') {
                if (startValue !== 0) {
                    const change = ((endValue - startValue) / Math.abs(startValue)) * 100;
                    setPercentageChange(change.toFixed(2) + '%');
                } else if (endValue !== 0) {
                    setPercentageChange('∞%'); // Infinite change from zero
                } else {
                    setPercentageChange('0%'); // No change if both are zero
                }
            } else {
                setPercentageChange('N/A'); // Invalid calculation
            }
        }
    }, [startPoint]);

    const handleMouseUp = useCallback(() => {
        setStartPoint(null);
        setEndPoint(null);
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

    return (
        <div ref={containerRef} style={{ width, height, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
                    </defs>
                    {!hideXaxis && <XAxis dataKey="name" />}
                    {!hideYaxis && <YAxis />}
                    <Tooltip content={<CustomTooltip importantMarkers={importantMarkers} percentageChange={percentageChange} />} />
                    <Area type="monotone" dataKey="uv" stroke={gradientColor} fillOpacity={1} fill="url(#colorUv)" />
                    {startPoint && <ReferenceLine x={startPoint.name} stroke="#8884d8" />}
                    {endPoint && <ReferenceLine x={endPoint.name} stroke="#8884d8" />}
                </AreaChart>
            </ResponsiveContainer>
            <CustomMarkers
                data={data}
                importantMarkers={importantMarkers}
                width={chartDimensions.width}
                height={chartDimensions.height}
            />
        </div>
    );
}

export default CustomGraph;