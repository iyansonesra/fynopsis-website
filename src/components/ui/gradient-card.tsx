import React, { ReactElement } from 'react';

interface GradientBoxProps {
    width?: string;
    height?: string;
    hasGradient?: boolean;
    title?: string;
    subtitle?: string;
    icon?: ReactElement;
}

const GradientBox: React.FC<GradientBoxProps> = ({
    width = 'auto',
    height = 'h-[16.5rem]',
    hasGradient = false,
    title = 'Title',
    icon,
    subtitle
}) => {
    if (hasGradient) {
        return (
            <div
                className={`bg-neutral-950 p-8 rounded-lg shadow-md ${height} relative overflow-hidden`}
                style={{ width }}
            >
                <svg width="0" height="0">
                    <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop stopColor="white" offset="0%" />
                        <stop stopColor="white" offset="40%" />
                        <stop stopColor="#93c5fd" offset="100%" />
                    </linearGradient>
                </svg>

                <div className="aspect-square h-[4.5rem] bg-black p-1 rounded-lg border border-white border-opacity-20">
                    <div className="aspect-square w-full h-full bg-gray-900 p-1 rounded-lg border border-white border-opacity-20">
                        <div className="aspect-square w-full h-full bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                            {icon && React.cloneElement(icon, {
                                className: 'w-8 h-8',
                                style: { stroke: "url(#icon-gradient)" }
                            })}
                        </div>
                    </div>
                </div>

                <div className="text-white font-montserrat absolute top-1/2">
                    <h1 className="text-xl font-semibold bg-gradient-to-b from-neutral-950 to-white to-50% bg-clip-text text-transparent">{title}</h1>
                    <h1 className="text-base md:text-sm lg:text-base font-thin text-white opacity-60 mt-2">{subtitle}</h1>
                    </div>
                <div className="absolute -bottom-1/2 -right-1/2 w-[100%] h-[100%] bg-blue-500 rounded-lg blur-3xl opacity-25"></div>
            </div>
        );
    }

    return (
        <div
            className={`bg-neutral-950 p-8 rounded-lg shadow-md ${height} relative overflow-hidden bg-gradient-border bg-clip-padding border border-transparent`}
            style={{ width }}
        >
            <svg width="0" height="0">
                <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop stopColor="white" offset="0%" />
                    <stop stopColor="white" offset="40%" />
                    <stop stopColor="gray-800" offset="100%" />
                </linearGradient>
            </svg>
            <div className="aspect-square h-[4.5rem] bg-black p-1 rounded-lg border border-white border-opacity-20">
                <div className="aspect-square w-full h-full bg-black p-1 rounded-lg border border-white border-opacity-20">
                    <div className="aspect-square w-full h-full bg-gradient-to-b from-gray-600 to-gray-800 rounded-lg flex items-center justify-center">
                        {icon && React.cloneElement(icon, {
                            className: 'w-8 h-8 ',
                            style: { stroke: "url(#icon-gradient)" }

                        })}
                    </div>
                </div>
            </div>

            <div className="text-white font-montserrat absolute top-1/2">
                <h1 className="text-xl font-semibold bg-gradient-to-b from-neutral-950 to-white to-50% bg-clip-text text-transparent">{title}</h1>
                <h1 className="text-base md:text-sm lg:text-base font-thin text-white opacity-60 mt-2">{subtitle}</h1>
            </div>
        </div>
    );
};

export default GradientBox;
