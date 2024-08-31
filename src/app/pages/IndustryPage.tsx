import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, Menu, LogOut, SettingsIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "../assets/fynopsis_noBG.png";
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { useAuthenticator } from '@aws-amplify/ui-react';
import Link from 'next/link';
import Industry from '@/components/Industry';

export default function IndustrySearch({ setSelectedTab }: { setSelectedTab: React.Dispatch<React.SetStateAction<string>> }) {
    const [searchInput, setSearchInput] = useState('');
    const [companyInput, setCompanyInput] = useState('');

    const [showIndustry, setShowIndustry] = useState(false);
    const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
    const { user, signOut } = useAuthenticator((context) => [context.user]);

    async function handleFetchUserAttributes() {
        try {
            const attributes = await fetchUserAttributes();
            setUserAttributes(attributes);
        } catch (error) {
            console.log(error);
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(e.target.value);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchInput.trim() !== '') {
            setShowIndustry(true);
        }
    };

    const handleInputChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompanyInput(e.target.value);
    };

    const handleKeyPress2 = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchInput.trim() !== '') {
            setShowIndustry(true);
        }
    };

    const handleTabChange = (tab: React.SetStateAction<string>) => {
        if (setSelectedTab) {
            setSelectedTab(tab);
        }
    };

    const handleBack = () => {
        setShowIndustry(false);
        setSearchInput('');
    };

    if (showIndustry) {
        return (
            <div className="flex flex-col h-screen w-full">
                <Industry
                    industryName={searchInput}
                    company={companyInput}
                    onBack={handleBack}
                />
            </div>
        );
    }

    return (
        <ScrollArea className="h-screen w-full sans-serif">
            <div className="flex flex-col min-h-screen w-full xl:px-4 2xl:px-8 ">
                <div className="flex-none w-full inline-block py-4 2xl:py-8 xl:py-6 flex justify-center items-center relative">
                    {/* Menu icon and Sheet for smaller screens */}
                    <div className="absolute left-4 lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <button className="p-2">
                                    <Menu className="h-6 w-6" />
                                </button>
                            </SheetTrigger>
                            <SheetContent side="left" className='pl-2 pt-3'>
                                <div className="flex flex-col justify-start items-start">
                                    <div className="inline-block w-full flex items-center gap-2 mb-4">
                                        <img src={logo.src} alt="Fynopsis Logo" className="h-8 w-8" />
                                        <h1>{userAttributes?.given_name} {userAttributes?.family_name} </h1>
                                    </div>

                                    <h2 className="text-lg font-semibold px-4">Menu</h2>
                                    <div className="flex-1">
                                        <nav className="grid items-start px-2 lg:text-base xl:text-lg 2xl:text-2xl font-medium lg:px-4">
                                            <Link
                                                href="#"
                                                className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary"
                                                onClick={() => handleTabChange("industrySearch")}
                                            >
                                                <Search className="h-4 w-4 2xl:h-6 2xl:w-6" />
                                                Industry Search
                                            </Link>
                                            <Link
                                                href="#"
                                                className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary"
                                                onClick={() => handleTabChange("settings")}
                                            >
                                                <SettingsIcon className="h-4 w-4 2xl:h-6 2xl:w-6" />
                                                Settings
                                            </Link>
                                        </nav>
                                    </div>
                                    <div className="absolute bottom-0 w-full flex">
                                        <button className="h-12 w-full justify-center flex flex-row items-center gap-2" onClick={signOut}>
                                            <h1 className="text-red-400">Logout</h1>
                                            <LogOut className="h-4 w-4 decoration-red-400" color={"#E74545"} />
                                        </button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <div className="flex flex-row gap-4 relative w-[70%] lg:w-[60%] ">
                        <input
                            type="text"
                            className="searchBar bg-slate-200 dark:bg-transparent dark:border-slate-400 dark:border-2 w-96 2xl:h-[4.5rem] lg:h-[3.5rem] h-[2.5rem] 2xl:text-xl text-lg rounded-full pl-12 lg:pl-16 xl:pl-20 2xl:pl-24"
                            placeholder="Search for an industry"
                            value={searchInput}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                        />

                        <input
                            type="text"
                            className="searchBar bg-slate-200 dark:bg-transparent dark:border-slate-400 dark:border-2 w-48 2xl:h-[4.5rem] lg:h-[3.5rem] h-[2.5rem] 2xl:text-xl text-base rounded-full pl-4"
                            placeholder="Company (optional)"
                            value={companyInput}
                            onChange={handleInputChange2}
                            onKeyPress={handleKeyPress}
                        />
                        <Search className="h-4 w-4 lg:h-6 lg:w-6 2xl:h-8 2xl:w-8 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
                {/* Add your industry search content here if needed */}
            </div>
        </ScrollArea>
    );
}