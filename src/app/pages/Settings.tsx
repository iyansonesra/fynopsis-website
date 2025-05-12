import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Search, LogOut, SettingsIcon } from "lucide-react";
import Link from 'next/link';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';

export default function Settings({ setSelectedTab }: { setSelectedTab: (tab: string) => void }) {
    const { user, signOut } = useAuthenticator((context) => [context.user]);
    const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);


    useEffect(() => {
        if (user) {
            handleFetchUserAttributes();
        }
    }, [user]);

    async function handleFetchUserAttributes() {
        try {
            const attributes = await fetchUserAttributes();
            setUserAttributes(attributes);
        } catch (error) {
        }
    }
    const handleTabChange = (tab: string) => {
        if (setSelectedTab) {
            setSelectedTab(tab);
        }
    };

    return (
        <div className="flex flex-col min-h-screen w-full xl:px-4 2xl:px-8">
            <div className="flex-none w-full inline-block py-4 2xl:py-8 xl:py-6 flex justify-center items-center relative">
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
                                    <h1>{userAttributes?.given_name} {userAttributes?.family_name} </h1>
                                </div>

                                <h2 className="text-lg font-semibold px-4">Menu</h2>
                                <div className="flex-1">
                                    <nav className="grid items-start px-2 lg:text-base xl:text-lg 2xl:text-2xl font-medium lg:px-4">
                                        <Link
                                            href="#"
                                            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary"
                                            onClick={() => handleTabChange("stockSearch")}
                                        >
                                            <Search className="h-4 w-4 2xl:h-6 2xl:w-6" />
                                            Stock Search
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

                <h1 className="text-2xl font-bold">Settings</h1>
            </div>
            {/* Add your settings content here */}
            <div className="flex-grow p-4">
                <h2 className="text-xl font-semibold mb-4">User Settings</h2>
                {/* Add more settings options as needed */}
            </div>
        </div>
    );
}