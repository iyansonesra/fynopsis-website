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

export default function Dashboard() {
    return (
        <div className=" flex flex-col h-full w-full 2xl:p-10 ">
            <div className="SearchContainer flex-[1] flex justify-center items-center">
                <div className="searchStrip flex w-full h-16 items-center justify-center">
                    <input type="text" className="searchBar bg-slate-200 w-[60%] h-[80%] rounded-full pl-16" placeholder="Search for a stock" />
                </div>
            </div>

            <div className="flex-[5] flex">
                <div className = "flex flex-col flex-[1] px-12">
                    <h1>Recent Searches</h1>
                    <RecentSearch image="" stockName="AAPL" stockDescription="Apple Inc." width="100%" imageType="circular" />
                </div>
                <Separator orientation="vertical" className="h-[90%] decoration-black justify-self-center self-center" />
                <div className = "flex flex-[1] "></div>


            </div>
        </div>
    )
}
