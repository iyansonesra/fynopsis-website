import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import NewsListing from "@/components/NewsListing";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import RecentNews from "@/components/RecentNews";
import RecentSearch from "@/components/RecentSearch";
import { Search } from "lucide-react";
import PinnedCompany from "@/components/PinnedCompanies";

export default function Dashboard() {
    return (
        <div className="flex flex-col min-h-screen w-full  xl:px-4 2xl:px-8 ">
            <div className="flex-none w-full inline-block py-4 2xl:py-8 xl:py-6 flex justify-center items-center">
                <div className="relative w-[70%] lg:w-[60%]">
                    <input 
                        type="text" 
                        className="searchBar bg-slate-200 w-full 2xl:h-[4.5rem] lg:h-[3.5rem] h-[2.5rem] 2xl:text-xl text-lg rounded-full pl-12 lg:pl-16 xl:pl-20 2xl:pl-24" 
                        placeholder="Search for a stock" 
                    />
                    <Search className="h-4 w-4 lg:h-6 lg:w-6 2xl:h-8 2xl:w-8 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-grow">
                <div className="lg:w-1/2 mb-4 lg:mb-0 w-full">
                    <div className="pl-4 mb-2 flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <h1 className="text-lg 2xl:text-xl font-semibold">Recent Searches</h1>
                    </div>
                    <ScrollArea className="inline-block lg:h-[calc(100vh-215px)]  2xl:h-[calc(100vh-290px)] w-[calc(100vw-5%)] lg:w-[calc(100vw-250px)] lg:w-full relative">
                        <div className="flex flex-row lg:flex-col lg:space-y-2 w-screen lg:w-full pr-4 pl-4
                        ">
                            {[...Array(8)].map((_, index) => (
                                <RecentSearch
                                    key={index}
                                    image=""
                                    stockName="AAPL"
                                    stockDescription="Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."
                                    imageType="circular"
                                />
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="lg:hidden" />
                        <ScrollBar orientation="vertical" className="hidden lg:flex" />
                        <div className="lg:hidden flex absolute bottom-0 right-0 h-full w-16 bg-gradient-to-r from-transparent to-white pointer-events-none"></div>

                    </ScrollArea>
                </div>
                <Separator orientation="vertical" className="h-[90%]  decoration-green-600 hidden lg:block" /> 

                {/* <div className="lg:w-1/2 pl-4 pr-4">
                    <div className="mb-2 flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <h1 className="text-lg 2xl:text-xl font-semibold">Pinned Companies</h1>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 justify-items-center">
                        {["AAPL", "NVDA", "TSLA", "GOOGL", "BRUH"].map((stock, index) => (
                            <PinnedCompany key={index} image="" stockName={stock} stockDescription="" />
                        ))}
                    </div>
                </div> */}

                <div className="pinnedCompaniesContainer flex-1 flex flex-col relative h-full lg:max-w-[50%] lg:pl-4 ">
                    <div className="h-[3%] pl-4 b-0 flex flex-row items-center gap-2 ">
                        <Search className="h-4 w-4" />
                        <h1 className="2xl:text-xl font-semibold">Pinned Companies</h1>
                    </div>

                    <div className="flex-grow w-full pl-4 md:flex-wrap flex flex-row flex-wrap gap-x-[3%]  content-start">
                        <PinnedCompany image={""} stockName={"AAPL"} stockDescription={""} />
                        <PinnedCompany image={""} stockName={"NVDA"} stockDescription={""} />
                        <PinnedCompany image={""} stockName={"TSLA"} stockDescription={""} />
                        <PinnedCompany image={""} stockName={"GOOGL"} stockDescription={""} />
                    </div>




                </div>


            </div>
        </div>
    );
}