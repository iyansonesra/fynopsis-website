import React from 'react';
import { SquareArrowOutUpRight, UsersRound } from 'lucide-react';
import linkedInLogo from '../app/assets/linkedin.png'

interface CompanyListingProps {
    url: string;
    name: string;
    numEmployees: string;
    linkedIn?: string;
}

function ensureHttpsUrl(url: string): string {
    if (url) {
        if (url.startsWith('https://')) {
            return url;
        }
        if (url.startsWith('http://')) {
            return 'https' + url.slice(4);
        }
    }
    return `https://${url}`;
}

function removeHttps(url: string): string {
    return url.replace(/^https?:\/\//, '');
}

const CompanyListing: React.FC<CompanyListingProps> = ({
    url,
    name,
    numEmployees,
    linkedIn,
}) => {
    const httpsUrl = ensureHttpsUrl(url);
    const nonHttpsUrl = removeHttps(url);
    console.log("https:" + httpsUrl);
    console.log("non-https:" + nonHttpsUrl);

    return (
        <div className='inline-block mb-2 w-48 text-center hover:bg-slate-100 dark:hover:bg-slate-800 py-2 rounded-2xl transition ease-in-out delay-50'>
            <div className="flex flex-col items-center">
                <img src={`https://cdn.brandfetch.io/${nonHttpsUrl}`} alt="Logos by Brandfetch" className='h-12 w-12 2xl:h-16 2xl:w-16 2xl:mb-2 rounded-full bg-white' />
                <h1 className="text-lg mb-1 font-medium 2xl:text-xl">{name}</h1>
                <div className="flex flex-row gap-1 mb-2">
                    <div className="inline-block px-2 py-[.1rem] gap-2 border-red-100 dark:border-red-700 dark:border border-2 rounded-full flex flex-row items-center">
                        <UsersRound size={12} color="#c93636" strokeWidth={3}/>
                        <h1 className="text-[.7rem] font-medium text-red-700">{numEmployees}</h1>
                    </div>

                    <div className="inline-block px-2 py-[.1rem] gap-2 border-2 border-green-100 dark:border-green-700 dark:border rounded-full flex flex-row items-center">
                        <UsersRound size={12} color="#2c6d30" strokeWidth={3}/>
                        <h1 className="text-[.7rem] font-medium text-green-700">{numEmployees}</h1>
                    </div>
                </div>

                <div className="flex flex-row gap-4">
                {linkedIn && (
                    <a href={ensureHttpsUrl(linkedIn)} target="_blank" rel="noreferrer">
                        <img src={linkedInLogo.src} alt="LinkedIn logo" className="h-5 w-5 rounded-sm"/>
                    </a>
                )}
                 <a href={httpsUrl} target="_blank" rel="noreferrer">
                 <SquareArrowOutUpRight className='h-5 w-5'/>
                 </a>
                </div>
            </div>
        </div>
    );
};

export default CompanyListing;