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
import { Instagram, Linkedin, MoveRight, Search, Sparkle, Star, User } from "lucide-react"
import PinnedCompany from "@/components/PinnedCompanies"
import React, { useRef, useEffect, useState } from 'react';
import Stock from "@/components/Stock"
import logo from "../assets/fynopsis_noBG.png"
import demo1 from "../assets/demo_page.png"
import graphZoom from '../assets/graphZoom.png'
import FadeInSlideUp from './../../components/animation/FadeInSlideUp';
import AIDisplay from '../assets/AIDisplay.png'
import UserSearchBubble from "@/components/UserSearchBubble"
import GPTResponse from "@/components/GPTResponse"
import { useRouter } from 'next/navigation';




export default function FrontPage() {


    const router = useRouter();

    function signIn() {
        router.push('/signin')
    }

    return (
        <div className="relative h-screen w-full flex flex-col justify-center sans-serif select-none ">
            <div className="fixed top-0 left-0 right-0 h-20 md:h-20 xl:h-24 bg-white dark:bg-slate-900 bg-opacity-98 w-full flex items-center justify-between 2xl:px-16 xl:px-12 md:px-8 sm:px-4 shadow-md px-4 z-50">
                <div className="flex flex-row items-center">
                    <img src={logo.src} alt="logo" className="md:h-12 md:w-auto w-[10%] h-auto" />
                    <h1 className="font-semibold text-xl sm:text-2xl md:text-3xl">Fynopsis</h1>
                </div>

                <div className="h-full flex items-center gap-4">
                    <a href="https://calendly.com/willzhang-utexas/fynopsis-demo" className="h-full flex items-center">
                        <button className="inline-block px-6 py-2 bg-gradient-to-br from-sky-500 to-sky-950 hover:from-sky-600 hover:to-gray-900 rounded-full font-semibold text-xl text-white max-sm:hidden md:flex text-center text-justify justify-center items-center">Book a Demo</button>
                    </a>
                    <button
                        className="inline-block whitespace-nowrap px-4 sm:px-6 py-2 border-sky-700 border-2 rounded-full font-semibold text-md sm:text-base md:text-xl text-sky-700"
                        onClick={signIn}
                    >
                        Sign In
                    </button>
                </div>
            </div>
            <div className="h-full w-full flex relative flex-col ">



                <div className="p-4 inline-block relative mt-16 pt-20 md:pb-36 pb-16 flex-col flex items-center justify-center gap-4 text-center z-0">
                    <div className="inline-block px-6 py-1 md:py-2 flex items-center justify-center rounded-full flex flex-row gap-2 bg-blue-100">
                        <Sparkle className="w-4 w-4 md:w-5 md:h-5 text-blue-500" />
                        <h1 className="font-semibold text-sky-700 text-sm md:text-base">Financial Assistant AI</h1>
                    </div>
                    <h1 className="font-semibold text-5xl md:text-7xl text-center">
                        <span className="bg-gradient-to-b from-sky-500 to-sky-950 text-transparent bg-clip-text">
                            Never
                        </span>{" "}
                        search again.
                    </h1>
                    <h1 className="font-normal text-base md:text-2xl text-center md:w-[50%] w-[96%]">Revolutionizing financial research with AI-driven, comprehensive company histories and event insights</h1>
                    <FadeInSlideUp className="flex flex-col sm:flex-col md:flex-row floor:flex-col gap-4 mt-4 z-10">

                        <a href="https://calendly.com/willzhang-utexas/fynopsis-demo">
                            <button className="px-6 py-4 rounded-full font-semibold text-xl text-white bg-gradient-to-br from-sky-500 to-sky-950 hover:from-sky-600 hover:to-gray-900 transition-all duration-300 hover:scale-105">
                                Book a Demo
                            </button>
                        </a>


                        <button className="w-full md:w-auto px-6 py-4 rounded-full font-semibold text-base md:text-xl border-2 transition-all duration-300 hover:scale-105">
                            <span className="bg-gradient-to-br from-sky-700 to-black dark:to-white dark:border-sky-700 bg-clip-text text-transparent">
                                See how it works
                            </span>
                        </button>

                    </FadeInSlideUp>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-300 rounded-full opacity-30 blur-[150px] z-0"></div>

                </div>

                <div className="w-full inline-block flex justify-center z-10 mb-24 md:mb-64">
                    <FadeInSlideUp>
                        <div className="relative inline-block"> {/* New wrapper div */}
                            <div className="absolute left-[2.5%] w-[95%] h-full bg-blue-400 blur-[40px] opacity-5"></div> {/* Glow effect */}
                            <img
                                src={demo1.src}
                                alt="demo"
                                className="w-[90%] h-auto rounded-3xl z-10 relative mx-auto"
                            />
                        </div>
                    </FadeInSlideUp>


                </div>



                <div className="w-full inline-block flex justify-center flex-col mb-24 md:mb-64 ">
                    <FadeInSlideUp className="flex justify-center flex-col items-center w-full">
                        <h1 className="text-3xl md:text-5xl font-semibold w-[95%] md:w-[70%] xl:w-[80%] text-center mb-1 md:mb-4">Instant insights, informed decisions:</h1>
                    </FadeInSlideUp>

                    <FadeInSlideUp className="w-auto inline-block flex justify-center flex-col items-center w-full mb-16">
                        <h1 className="font-normal text-3xl md:text-5xl text-center text-black">
                            <span className="bg-gradient-to-t from-sky-500 to-sky-950 text-transparent bg-clip-text">
                                Your
                            </span>{" "}
                            <span className="font-normal dark:text-white">financial edge.</span>
                        </h1>
                    </FadeInSlideUp>

                    <div className="w-full inline-block flex justify-center flex-col items-center w-full">
                        <div className="flex flex-col md:flex-row w-[85%] 2xl:w-[70%] inline-block ">
                            <div className="flex-1 flex justify-center mb-4 md:mb-0">
                                <FadeInSlideUp className=" flex justify-center">
                                    <img src={graphZoom.src} alt="graph" className="w-[90%] h-auto" />
                                </FadeInSlideUp>
                            </div>
                            <div className="flex-1 flex items-center justify-around flex-col">
                                <div className="w-full flex items-right md:items-end flex-col mb-4 md:mb-0">
                                    <FadeInSlideUp>
                                        <h1 className="font-semibold text-3xl md:text-5xl text-center md:text-right text-black dark:text-white mb-4"> Graphs that give meaning.</h1>
                                    </FadeInSlideUp>

                                    <FadeInSlideUp>
                                        <h1 className="font-normal text-lg md:text-xl text-center md:text-right text-black dark:text-white">Visualize events with rich context, understanding impacts at a glance</h1>
                                    </FadeInSlideUp>
                                </div>


                                <FadeInSlideUp className="w-full flex justify-center md:justify-end">
                                    <a href="https://calendly.com/willzhang-utexas/fynopsis-demo">
                                        <button className="px-6 py-4 rounded-full font-semibold text-xl text-white bg-gradient-to-br from-sky-500 to-sky-950 hover:from-sky-600 hover:to-gray-900 transition-all duration-300 hover:scale-105">
                                            Book a Demo
                                        </button>
                                    </a>

                                </FadeInSlideUp>
                            </div>

                        </div>
                    </div>


                </div>

                <div className="w-full inline-block flex justify-center items-center flex-col mb-24">




                    <div className="flex flex-col md:flex-row w-[85%] 2xl:w-[70%] inline-block justify-center items-center">
                        <div className="flex-1 flex items-center h-[80%] justify-center gap-[30%] flex-col ">
                            <div className="w-full flex items-center md:items-start flex-col mb-4 md:mb-0">
                                <FadeInSlideUp>
                                    <h1 className="font-semibold text-3xl md:text-5xl text-center md:text-left text-black dark:text-white mb-1 md:mb-4">Tools that provide a deeper understanding</h1>
                                </FadeInSlideUp>

                                <FadeInSlideUp>
                                    <h1 className="font-normal text-xl text-center md:text-left text-black dark:text-white">Dig deep into the specifics with our GPT Chat Bot</h1>
                                </FadeInSlideUp>
                            </div>


                            <FadeInSlideUp className="w-full md:flex justify-center hidden md:justify-start mb-4 md:mb-0">
                                <a href="https://calendly.com/willzhang-utexas/fynopsis-demo">
                                    <button className="px-6 py-4 rounded-full font-semibold text-xl text-white bg-gradient-to-br from-sky-500 to-sky-950 hover:from-sky-600 hover:to-gray-900 transition-all duration-300 hover:scale-105">
                                        Book a Demo
                                    </button>
                                </a>
                            </FadeInSlideUp>

                        </div>
                        <div className="flex-1 flex justify-end items-end flex-col gap-6 ">
                            <FadeInSlideUp>
                                <img src={AIDisplay.src} alt="graph" className="w-[100%] h-auto mb-4" />
                            </FadeInSlideUp>

                            <FadeInSlideUp className="w-full flex mb-2">
                                <UserSearchBubble userSearch={"I want to learn more about Apple's recent deals"} />
                            </FadeInSlideUp>

                            <FadeInSlideUp className="w-full flex mb-2">
                                <GPTResponse userSearch={"Sure, Apple has been aggressively pursuing sports rights, aiming to bolster its Apple TV+ platform."} />
                            </FadeInSlideUp>

                            <FadeInSlideUp className="w-full flex mb-2">
                                <UserSearchBubble userSearch={"What sports have they been pushing for?"} />
                            </FadeInSlideUp>

                            <FadeInSlideUp className="w-full flex mb-2">
                                <GPTResponse userSearch={"They have been looking to acquire the rights to the MLB, FIFA World Cup, and the NBA"} />
                            </FadeInSlideUp>

                            <FadeInSlideUp className="w-full flex mb-4 md:mb-2">
                                <UserSearchBubble userSearch={"Thanks!"} />
                            </FadeInSlideUp>
                        </div>

                        <FadeInSlideUp className="w-full md:hidden justify-center flex md:justify-start mb-4 md:mb-0">
                            <a href="https://calendly.com/willzhang-utexas/fynopsis-demo">
                                <button className="px-6 py-4 rounded-full font-semibold text-xl text-white bg-gradient-to-br from-sky-500 to-sky-950 hover:from-sky-600 hover:to-gray-900 transition-all duration-300 hover:scale-105">
                                    Book a Demo
                                </button>
                            </a>
                        </FadeInSlideUp>

                    </div>



                </div>

                <Separator className="decoration-black w-[100%]" />

                <div className="w-full inline-block flex justify-center items-center flex-col">
                    <div className="flex flex-row py-12 gap-64">
                        <div className="flex flex-row items-center">
                            <img src={logo.src} alt="logo" className="md:h-6 md:w-auto w-[10%] h-auto" />
                            <h1 className="font-semibold text-xl sm:text-2xl md:text-lg">Fynopsis</h1>
                        </div>

                        <div className="flex flex-row items-center gap-4">
                            <Instagram className="w-6 h-6 text-black dark:text-white" />
                            <Linkedin className="w-6 h-6 text-black dark:text-white" />
                        </div>
                    </div>


                    <Separator className="decoration-black w-[45%]" />
                    <div className="flex flex-row gap-6 py-4">

                        <h1>© 2024 Fynopsis All rights reserved.</h1>
                        <h1>Privacy Policy</h1>
                        <h1>Terms of Service</h1>
                    </div>


                </div>


            </div>
        </div>
    )
}