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
import { MoveRight, Search, Sparkle, Star } from "lucide-react"
import PinnedCompany from "@/components/PinnedCompanies"
import React, { useRef, useEffect, useState } from 'react';
import Stock from "@/components/Stock"
import logo from "../assets/full_logo.png"
import demo1 from "../assets/demo_page.png"

export default function FrontPage() {
    return (
        <div className="relative h-screen w-full font-montserrat ">
            <div className="fixed top-0 left-0 right-0 h-20 xl:h-24 bg-white bg-opacity-98 w-full flex items-center justify-between 2xl:px-16 xl:px-12 md:px-8 sm:px-4 shadow-md px-4 z-50">
                <img src={logo.src} alt="logo" className="md:h-12 md:w-auto w-[35%] h-auto" />
                <div className="h-full flex items-center gap-4">
                    <button className="xl:h-[50%] h-[60%] inline-block px-6 bg-sky-700 rounded-full font-bold text-xl text-white max-sm:hidden md:flex text-center text-justify justify-center items-center">Book a Demo</button>
                    <button className="xl:h-[50%] h-[60%]  inline-block px-6 border-sky-700 border-2 rounded-full font-bold text-xl text-sky-700">Sign In</button>
                </div>
            </div>
            <ScrollArea className="h-full w-full flex relative">

                <div className="h-28"></div>
                {/* <div className = " w-full h-[5rem] bg-blue-50 flex justify-around flex-row items-center px-40">
                    <h1>Y Combinator</h1>
                    <h1 className = "font-bold text-sky-700 text-lg">We are participating in YC24!</h1>
                    <div className = "inline-block bg-sky-700 text-white px-4 py-2 rounded-full font-semibold flex flex-row gap-2 items-center">
                        <button>Investor? Email Us</button> 
                        <MoveRight className="w-5 h-5"/>
                    </div>
                    
                </div> */}
                <div className="p-4 inline-block relative mt-16 pt-4 md:pb-36 pb-16 flex-col flex items-center justify-center gap-4 text-center z-0 ">
                    <div className="inline-block px-6 py-2 bg-blue-100 flex items-center justify-center rounded-full flex flex-row gap-2">
                        <Sparkle className="w- h-5 text-blue-500" />
                        <h1 className="font-bold text-sky-700">Financial Assistant AI</h1>
                    </div>
                    <h1 className="font-bold text-7xl text-center">
                        <span className="bg-gradient-to-br from-blue-500 to-black text-transparent bg-clip-text">
                            Never
                        </span>{" "}
                        search again.
                    </h1>
                    <h1 className="font-normal text-2xl text-center md:w-[50%] w-[80%]">Revolutionizing financial research with AI-driven, comprehensive company histories and event insights</h1>
                    <div className="flex flex-col sm:flex-col md:flex-row floor:flex-col gap-4 mt-4">
                        <button className="px-6 py-4 rounded-full font-bold text-xl text-white bg-gradient-to-br from-sky-700 to-black hover:from-sky-600 hover:to-gray-900 transition-all duration-300 hover:scale-105">
                            Book a Demo
                        </button>

                        <button className="px-6 py-4 rounded-full font-bold text-xl border-2 transition-all duration-300 hover:scale-105">
                            <span className="bg-gradient-to-br from-sky-700 to-black bg-clip-text text-transparent">
                                See how it works
                            </span>
                        </button>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-300 rounded-full opacity-30 blur-[150px] z-0"></div>

                </div>

                <div className="w-full inline-block flex justify-center z-10">

                    <div className="relative inline-block"> {/* New wrapper div */}
                        <div className="absolute left-[2.5%] w-[95%] h-full bg-blue-400 blur-[40px] opacity-5"></div> {/* Glow effect */}
                        <img
                            src={demo1.src}
                            alt="demo"
                            className="w-[85%] h-auto rounded-3xl z-10 relative mx-auto"
                        />
                    </div>

                </div>


            </ScrollArea>
        </div>
    )
}