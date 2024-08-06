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
import Stock from "@/components/Stock"

export default function Settings() {

    return (
        <div className="flex flex-col h-screen w-full">
            {/* <Stock image={""} stockName={"AAPL"} stockDescription={""} imageType={"circular"} /> */}
        </div>
    )
}

