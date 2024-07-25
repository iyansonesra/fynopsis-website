import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import NewsListing from "@/components/NewsListing"
import { ScrollArea } from "@/components/ui/scroll-area"

import { Separator } from "@/components/ui/separator"
import RecentNews from "@/components/RecentNews"
import RecentSearch from "@/components/RecentSearch"
import { Search } from "lucide-react"
import PinnedCompany from "@/components/PinnedCompanies"
import React, { useRef, useEffect, useState } from 'react';

export default function Dashboard() {

    return (
        <div className="flex flex-col h-screen w-full xl:px-4 2xl:px-8 ">
            <div className="flex-1 h-[50px] flex items-center justify-center">
                <input type="text" className="searchBar bg-slate-200 w-[60%] h-[60%] rounded-full pl-16" placeholder="Search for a stock" />
            </div>

            <div className="flex  flex-row flex-[7] h-[70px]">
                <div className="flex-1 flex flex-col relative h-full max-w-[50%] ">
                    <div className="h-[5%] pl-4 b-0 flex flex-row items-center gap-2">
                        <Search className="h-4 w-4" />
                        <h1 className="2xl:text-xl font-semibold">Recent Searches</h1>
                    </div>

                    <ScrollArea className="relative flex-grow w-full pr-4">
                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />
                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />
                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />

                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />

                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />

                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />

                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />

                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />

                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />

                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />
                        <RecentSearch
                            image={""}
                            stockName={"AAPL"}
                            stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                            width={"100%"}
                            imageType={"circular"}
                        />
                    </ScrollArea>


                </div>
                <Separator orientation="vertical" className="h-[90%] decoration-black justify-self-center self-center" />
                <div className="pinnedCompaniesContainer flex-1 flex flex-col relative h-full max-w-[50%] pl-4">
                    <div className="h-[5%] pl-4 b-0 flex flex-row items-center gap-2">
                        <Search className="h-4 w-4" />
                        <h1 className="2xl:text-xl font-semibold">Pinned Companies</h1>
                    </div>

                    <div className = "flex-grow xs:flex-nowrap xs:flex-col lg:flex-wrap w-full pl-4 flex flex-row flex-wrap gap-x-[3%]  content-start">
                        <PinnedCompany image={""} stockName={"AAPL"} stockDescription={""} />
                        <PinnedCompany image={""} stockName={"NVDA"} stockDescription={""}/>
                        <PinnedCompany image={""} stockName={"TSLA"} stockDescription={""}/>
                        <PinnedCompany image={""} stockName={"GOOGL"} stockDescription={""}/>

                       
                    </div>

                    


                </div>

            </div>



        </div>
    )
}

{/** <div className="SearchContainer flex-[1] flex justify-center items-center">
                <div className="searchStrip flex w-full h-16 items-center justify-center">
                    <input type="text" className="searchBar bg-slate-200 w-[60%] h-[80%] rounded-full pl-16" placeholder="Search for a stock" />
                </div>
            </div>

            <div className="flex-[5] flex h-4 bg-blue-100">
          
                <Separator orientation="vertical" className="h-[90%] decoration-black justify-self-center self-center" />
                <div className="flex flex-[1] h-4 "></div>


            </div> 
            
             {/* <div className="fleflex-1 bg-green-100">
                <ScrollArea>
                    <NewsListing
                        image={""}
                        stockName={"AAPL"}
                        stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                        width={"100%"}
                        imageType={"circular"}
                    />

                    <NewsListing
                        image={""}
                        stockName={"AAPL"}
                        stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                        width={"100%"}
                        imageType={"circular"}
                    />

                    <NewsListing
                        image={""}
                        stockName={"AAPL"}
                        stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                        width={"100%"}
                        imageType={"circular"}
                    />

                    <NewsListing
                        image={""}
                        stockName={"AAPL"}
                        stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                        width={"100%"}
                        imageType={"circular"}
                    />

                    <NewsListing
                        image={""}
                        stockName={"AAPL"}
                        stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                        width={"100%"}
                        imageType={"circular"}
                    />

                    <NewsListing
                        image={""}
                        stockName={"AAPL"}
                        stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                        width={"100%"}
                        imageType={"circular"}
                    />

                </ScrollArea>
            </div> **/}
