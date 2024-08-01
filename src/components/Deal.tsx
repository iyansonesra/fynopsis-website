import { CopyIcon } from 'lucide-react';
import React, { useState } from 'react';
import { Separator } from './ui/separator';

interface DealProps {
    date: string;
    dealDescription: string;
}

const Deal: React.FC<DealProps> = ({
    date,
    dealDescription
}) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        const textToCopy = `${date}\n${dealDescription}`;
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                setIsCopied(true);
                console.log('Text copied to clipboard');
                
                // Reset the "Copied!" text after 2 seconds
                setTimeout(() => {
                    setIsCopied(false);
                }, 1000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    };

    return (
        <div className="flex flex-col w-full rounded-2xl overflow-hidden py-2 pl-4 pr-2">
            <div className="flex flex-row items-center">
                <h1 className="text-sm text-black truncate 2xl:text-lg">{date}</h1>
                {isCopied ? (
                    <span className="ml-2 text-xs text-green-600">Copied!</span>
                ) : (
                    <button 
                        onClick={handleCopy} 
                        className="ml-2 focus:outline-none"
                        aria-label="Copy deal information"
                    >
                        <CopyIcon className="h-4 w-4" />
                    </button>
                )}
            </div>
            <p className="text-xs text-slate-500 overflow-hidden line-clamp-2 2xl:text-base mb-2">
                {dealDescription}
            </p>
            <Separator />
        </div>
    );
};

export default Deal;