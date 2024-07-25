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

export default function Dashboard() {
    return (
        <div className=" flex flex-row h-full w-full p-2 lg:p-4 xl:p-8 2xl:p-10 gap-8">
            <div className="smallerCompAndRecentNews flex-[5]  flex flex-col gap-8">
                <div className="smallerComp flex-[1] rounded-2xl flex flex-row gap-8">
                    <div className="firstComp flex-[2] bg-white rounded-2xl border"></div>
                    <div className="secondComp flex-[1] bg-white rounded-2xl border"></div>
                </div>
                <div className="recentNews flex-[2] 2xl:flex-[3] rounded-2xl border bg-white flex flex-col h-[30%]">
                    <div className="flex flex-[1] items-center pl-4 2xl:pl-8">
                        <h1 className="text-xs 2xl:text-2xl font-semibold">Recent News</h1>

                    </div>
                    <Separator className="decoration-black w-[100%]" />
                    <div className="flex-[4] 2xl:flex-[5] rounded-2xl flex flex-col overflow-hidden relative">
                        <ScrollArea className="h-full w-full 2xl:px-4"> {/* Wrap content in ScrollArea */}
                            <RecentNews
                                image={""}
                                stockName={"AAPL"}
                                stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                                width={"100%"}
                                imageType={"circular"}
                            />

                            <RecentNews
                                image={""}
                                stockName={"AAPL"}
                                stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                                width={"100%"}
                                imageType={"circular"}
                            />

                            <RecentNews
                                image={""}
                                stockName={"AAPL"}
                                stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                                width={"100%"}
                                imageType={"circular"}
                            />

                            <RecentNews
                                image={""}
                                stockName={"AAPL"}
                                stockDescription={"Apple Inc. is a multinational technology company specializing in consumer electronics, software, and online services."}
                                width={"100%"}
                                imageType={"circular"}
                            />
                        </ScrollArea>

                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>

                    </div>

                    
                </div>
            </div>
            <div className="companyWatch flex-[3] rounded-2xl border flex bg-white flex-col h-[100%]">
                <div className="flex-[1] rounded-2xl bg-white flex flex-col items-align justify-center pl-4 2xl:pl-8">
                    <h1 className="text-xs 2xl:text-2xl font-semibold">Companies to Watch</h1>
                </div>
                <Separator className="decoration-black w-[100%]" />
                <div className="flex-[1] flex flex-row">
                    <div className="flex-[1] flex items-center justify-center">
                        <h1 className="text-xs 2xl:text-lg font-med text-center">New Entrants</h1>
                    </div>
                    <Separator orientation="vertical" className="h-[100%] decoration-black" />
                    <div className="flex-[1] px-1 2xl:px-4 flex items-center justify-center">
                        <h1 className="text-xs 2xl:text-lg font-med text-center">Most Capital Raised</h1>
                    </div>
                    <Separator orientation="vertical" className="hs-[100%] decoration-black" />
                    <div className="flex-[1] flex items-center justify-center">
                        <h1 className="text-xs 2xl:text-lg font-med text-center">Most Likely Fundraising</h1>

                    </div>
                </div>
                <Separator className="decoration-black w-[100%]" />
                <div className="flex-[7] 2xl:flex-[8] rounded-2xl flex flex-col overflow-hidden relative">
                    <ScrollArea className="h-full w-full 2xl:px-4"> {/* Wrap content in ScrollArea */}
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

                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>


                </div>

            </div>
        </div>
    )
}

{/*  <div className="generalGrid w-full h-full grid grid-rows-10 grid-cols-12 gap-x-5 gap-y-5">
                <div className="smallComponents col-start-1 col-end-8 row-start-1 row-end-4 grid grid-rows-1 grid-cols-3 gap-x-5 ">
                    <div className="border h-full rounded-2xl bg-white col-span-2"></div>

                    <div className="border rounded-2xl bg-white"></div>

                    </div>
                    <div className="CompaniesToWatch col-start-8 col-end-13 row-start-1 row-end-11 border rounded-2xl overflow-hidden">
                        <div className="bg-white h-full w-full rounded-2xl flex flex-col">
                            <div className="w-full h-12 2xl:h-20 flex items-center pl-4 rounded-2xl">
                                <h1 className="text-xs 2xl:text-lg font-semibold">Companies to Watch</h1>
                            </div>
                            <Separator className="decoration-black w-[100%]" />
                            <div className="w-full h-12 2xl:h-16 flex flex-row flex-shrink-0">
                                <div className="flex-1 flex items-center justify-center">
                                    <h1 className="text-xs 2xl:text-base font-med text-center">New Entrants</h1>
                                </div>
                                <Separator orientation="vertical" className="h-[100%] decoration-black" />
                                <div className="flex-1 flex items-center justify-center">
                                    <h1 className="text-xs 2xl:text-lg font-med text-center">Most Capital Raised</h1>
    
                                </div>
                                <Separator orientation="vertical" className="h-[100%] decoration-black flex-shrink-0" />
                                <div className="flex-1 flex items-center justify-center">
                                    <h1 className="text-xs 2xl:text-base font-med text-center">Most Likely Fundraising</h1>
                                </div>
                            </div>
                            <Separator className="decoration-black w-[100%]" />
                            <div className="ScrollAreaHolder relative h-80">
                                <ScrollArea className="h-full w-full">
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
    
                                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
    
    
    
                            </div>
    
                        </div>
    
    
    
    
                    </div>
    
                    <div className="col-start-1 col-end-8 row-start-4 row-end-11 border rounded-2xl">
                        <div className="bg-white h-full w-full rounded-2xl">
                            <div className="w-full h-12 2xl:h-20 flex items-center pl-4">
                                <h1 className="text-xs 2xl:text-lg font-semibold">Recent News</h1>
                            </div>
                            <Separator className="decoration-black w-[100%]" />
                        </div>
                    </div>
    
    
                </div>
                */}