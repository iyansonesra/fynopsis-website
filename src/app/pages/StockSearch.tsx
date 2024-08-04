import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import NewsListing from "@/components/NewsListing";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import RecentNews from "@/components/RecentNews";
import RecentSearch from "@/components/RecentSearch";
import { Search } from "lucide-react";
import PinnedCompany from "@/components/PinnedCompanies";
import Stock from '@/components/Stock';

export default function Dashboard() {
    const [searchInput, setSearchInput] = useState('');
    const [showStock, setShowStock] = useState(false);

    const handleInputChange = (e) => {
        setSearchInput(e.target.value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && searchInput.trim() !== '') {
            setShowStock(true);
        }
    };

    if (showStock) {
        return (
            <div className="flex flex-col h-screen w-full">
                <Stock companyName={searchInput} image={''} stockDescription={''} imageType={'circular'} />
            </div>
        );

    }

    return (
        <div className="flex flex-col min-h-screen w-full xl:px-4 2xl:px-8 ">
            <div className="flex-none w-full inline-block py-4 2xl:py-8 xl:py-6 flex justify-center items-center">
                <div className="relative w-[70%] lg:w-[60%] ">
                    <input
                        type="text"
                        className="searchBar bg-slate-200 w-full 2xl:h-[4.5rem] lg:h-[3.5rem] h-[2.5rem] 2xl:text-xl text-lg rounded-full pl-12 lg:pl-16 xl:pl-20 2xl:pl-24"
                        placeholder="Search for a stock"
                        value={searchInput}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                    />
                    <Search className="h-4 w-4 lg:h-6 lg:w-6 2xl:h-8 2xl:w-8 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
            </div>
        </div>
    );
}