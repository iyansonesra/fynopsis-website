import { Library, Users, TrendingUp, LucideIcon, ChevronRight, Lock, PersonStanding, ArrowRight, Linkedin } from 'lucide-react';
import React, { useRef, useEffect, useState } from 'react';
import logo from './../assets/fynopsis_noBG.png'
import FadeInSlideUp from '../../components/animation/FadeInSlideUp';
import { useRouter } from 'next/navigation';
import darkDemo from './../assets/dark_demo.png';
import AnimatedGridPattern from '@/components/ui/animated-grid-pattern';
import { cn } from '@/lib/utils';
import AnimatedGradientText from '@/components/ui/animated-gradient-text';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { NeonGradientCard } from '@/components/ui/neon-gradient-card';
import GradientBox from '@/components/ui/gradient-card';
import { Database, ChevronsUp } from 'lucide-react';
import { TimelineDemo } from '@/components/ui/timeline-demo';
import ChangeLogDemo from '@/components/animation/ChangeLogDemo';
import CircleBurstAnimation from '@/components/animation/CircleAnimation';
import FlowingLine from '@/components/animation/Squiggle';
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background';
import { Separator } from '@/components/ui/separator';
import { post } from 'aws-amplify/api';

interface Tab {
    icon: LucideIcon;
    label: string;
}

interface IndicatorStyle {
    top: string;
    height: string;
}

const FrontPage: React.FC = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<number | null>(null);
    const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({} as IndicatorStyle);
    const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitErrorBottom, setSubmitErrorBottom] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitSuccessBottom, setSubmitSuccessBottom] = useState(false);

    const tabs: Tab[] = [
        { icon: Library, label: 'Library' },
        { icon: Users, label: 'People' },
        { icon: TrendingUp, label: 'Trending' }
    ];

    const handleRequestDemo = () => {
        window.open('https://calendar.app.google/EfAsJD2WQvL8Ejtw6', '_blank');
    };

    const handleContactUs = () => {
        window.location.href = 'mailto:founders@fynopsis.ai';
    };

    useEffect(() => {
        if (activeTab !== null && tabRefs.current[activeTab]) {
            const tabElement = tabRefs.current[activeTab];
            if (tabElement) {
                setIndicatorStyle({
                    top: `${tabElement.offsetTop}px`,
                    height: `${tabElement.offsetHeight}px`,
                });
            }
        }
    }, [activeTab]);


    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            <div className="absolute inset-0">
                <div className="w-full h-full bg-black" />
            </div>

            <div className="relative z-10 w-full">
                <FlowingLine amplitude={1000} className=' absolute top-[37%] w-full rotate-180' />
                <FlowingLine amplitude={700} className=' absolute top-[62%] md:top-[60%] w-full rotate-140' />

                <AnimatedGridPattern
                    numSquares={30}
                    maxOpacity={0.1}
                    duration={3}
                    repeatDelay={1}
                    className={cn(
                        "[mask-image:radial-gradient(ellipse_at_top,white,transparent)]",
                        "absolute top-0 flex flex-col gap-4 z-0 opacity-40",
                    )}
                />

                <div className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm ">
                    <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">

                        <div className="flex items-center gap-2">
                            <img
                                src={logo.src}
                                alt="Fynopsis Logo"
                                className="h-8 w-auto"
                            />
                            <span className="font-semibold text-xl text-white font-montserrat">Fynopsis</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                className="px-4 py-2 text-sm font-medium text-white hover:text-blue-200 transition-colors"
                                onClick={() => router.push('/signin')}
                            >
                                Log in
                            </button>
                            {/* <button
                                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
                                onClick={() => router.push('/signin')}
                            >
                                Sign up
                            </button> */}
                        </div>
                    </div>
                </div>
                <div className="w-full min-h-screen flex flex-col gap-4 ">
                    <div className="mt-28 flex items-center flex-col justify-center mx-auto gap-4">
                        <AnimatedGradientText>
                            <span
                                className={cn(
                                    `inline bg-gradient-to-r from-[#38B6FF] via-[#5271FF] to-[#004AAD] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`,
                                )}
                            >
                                Introducing Fynopsis
                            </span>
                            <ChevronRight className="ml-1 size-3 transition-transform duration-300 text-white ease-in-out group-hover:translate-x-0.5" />
                        </AnimatedGradientText>


                        <div className="flex flex-col gap-2 items-center justify-center">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl text-center max-w-[70%] md:max-w-[80%] lg:max-w-[100%]  font-cormorant font-semibold text-white">
                                AI-powered data rooms for your team.
                            </h1>
                            <h1 className="lext-lg md:text-lg lg:text-xl text-center max-w-[70%]  font-thin text-white">
                                Search and organize thousands of documents in seconds, so you can focus on what matters.
                            </h1>
                            <div className=" relative flex flex-col ">
                                <div className="flex flex-col lg:flex-row justify-center items-center lg:gap-0 gap-4 text-center w-full mt-4">
                                    <div className="flex flex-col md:flex-row justify-center items-center lg:gap-0 md:gap-2 sm:gap-2 gap-3 text-center w-full">
                                        <button
                                            onClick={handleRequestDemo}
                                            className="bg-gradient-to-r from-[#1e6aa3] via-[#3148b3] to-[#003580] w-48 lg:w-48 text-white rounded-full py-3 px-6 hover:opacity-90 transition-all"
                                        >
                                            Request a Demo
                                        </button>
                                        <button
                                            onClick={handleContactUs}
                                            className="bg-transparent border border-white w-48 lg:w-48 text-white rounded-full py-3 px-6 ml-2 hover:bg-white hover:text-[#3148b3] transition-all"
                                        >
                                            Contact Us
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col h-8 items-center justify-center w-full sm:mt-4 md:mt-2 xl:mt-1 inline-block">
                                    {submitError && <p className="text-red-500 mt-2 max-w-[60%] text-center ">{submitError}</p>}
                                    {submitSuccess && <p className="text-green-500 mt-2 max-w-[60%] text-center ">Thank you for your interest! We&apos;ll be in touch soon.</p>}


                                </div>

                            </div>

                        </div>


                        <FadeInSlideUp className="mt-12 relative max-w-[80%]    mx-auto">
                            <NeonGradientCard className="items-center justify-center text-center">
                                <img
                                    src={darkDemo.src}
                                    alt="Demo screenshot"
                                    className="relative w-full rounded-3xl shadow-2xl"
                                    style={{
                                        transform: 'rotateX(2deg)',
                                    }}
                                />
                            </NeonGradientCard>
                        </FadeInSlideUp>

                        {/* Video Embed Section */}
                        {/* <FadeInSlideUp className="mt-16 relative max-w-[90%] md:max-w-[95%] lg:max-w-[90%] mx-auto">
                            <h2 className="text-2xl md:text-3xl font-semibold text-center mb-6 text-white font-cormorant">
                                See <span className="bg-gradient-to-r from-[#38B6FF] via-[#5271FF] to-[#004AAD] bg-clip-text text-transparent">Fynopsis</span> in Action
                            </h2>
                            <NeonGradientCard className="items-center justify-center text-center p-1">
                                <div className="rounded-3xl overflow-hidden w-full aspect-video md:h-[450px] lg:h-[550px] xl:h-[650px]">
                                    <iframe
                                        src="https://drive.google.com/file/d/1OBfU2etnjAofWTmFU5Bm_wIrlAr8xiMe/preview"
                                        className="w-full h-full"
                                        allow="autoplay"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            </NeonGradientCard>
                        </FadeInSlideUp> */}
                    </div>

                    <div className="mt-12 flex flex-col items-center justify-center w-full  gap-4 z-40">

                        <div
                            className={
                                "mt-8 xl:mt-16 2xl:mt-24 flex  w-[80%] flex-col gap-4 lg:flex-row  z-40"
                            }
                        >

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                <FadeInSlideUp className="md:col-span-2">
                                    <div className="relative rounded-lg shadow-md h-64 md:pb-0 pb-6 justify-end md:justify-start relative overflow-hidden flex flex-col">
                                        <div className="absolute inset-0 [mask-image:radial-gradient(100px,transparent_20%,green)]" />

                                        <h1 className="text-5xl md:text-6xl 2xl:text-7xl text-left font-semibold font-cormorant text-white">
                                            Do more with more of your{' '}
                                            <span className="bg-gradient-to-r from-[#38B6FF] to-[#004AAD] bg-clip-text text-transparent">
                                                Files.
                                            </span>
                                        </h1>
                                    </div>
                                </FadeInSlideUp>
                                <FadeInSlideUp>
                                    <GradientBox hasGradient={true} title='Easy Data Decisions' subtitle="Leverage AI Powered Insights and Analysis To Make Well-Informed Decisions" icon={<Database />} />

                                </FadeInSlideUp>

                                <FadeInSlideUp>
                                    <GradientBox hasGradient={false} title='Boost Efficiency' subtitle='Turn 3-Month Deal Times Into 3 Weeks With Optimized Dataroom Workflows' icon={<ChevronsUp />} />
                                </FadeInSlideUp>

                                <FadeInSlideUp>
                                    <GradientBox hasGradient={true} subtitle="Do Away With Document Clutter. Sort Dataroom File Structure Any Way You Like" title='Effortless Personalization' icon={<PersonStanding />} />

                                </FadeInSlideUp>

                                <FadeInSlideUp>
                                    <GradientBox hasGradient={false} title='Secure & Reliable' subtitle="Safely Send Thousands of Documents with SOC 2 Compliant Storage" icon={<Lock />} />

                                </FadeInSlideUp>
                            </div>
                        </div>



                    </div>

                </div>
                <div className='w-full md:min-h-screen flex flex-col gap-4 mt-16 items-center justify-center'>
                    <div className="flex md:flex-row flex-col w-[80%] ">
                        <div className="flex flex-1 md:max-w-[50%]">
                            <div className="flex-1 flex-col max-w-[100%] flex justify-center items-center ">
                                <h1 className="md:text-left text-center text-4xl md:text-5xl 2xl:text-6xl font-semibold mb-2 text-white font-cormorant">Stay in the Loop with  <span className="bg-gradient-to-r from-[#38B6FF] to-[#004AAD] bg-clip-text text-transparent">
                                    Smart
                                </span> Document Digests</h1>
                                <h1 className="md:text-left text-center text-lg md:text-xl 2xl:text-2xl font-montserrat text-slate-300 font-thin">Get instant, AI-powered summaries of document changes and updates across your data room, ensuring you never miss critical modifications.</h1>
                            </div>

                        </div>
                        <div className="flex flex-1 md:max-w-[50%]">
                            <ChangeLogDemo />
                        </div>


                    </div>


                </div>

                <div className='w-full min-h-screen flex flex-col gap-4 mt-16 items-center justify-center'>
                    <div className="flex md:flex-row flex-col-reverse w-[80%] ">
                        <div className="mt-4 md:mt-12 flex flex-1 md:max-w-[50%]">
                            <CircleBurstAnimation />
                        </div>

                        <div className="flex flex-1 max-w-[100%] md:max-w-[50%] mb-6 md:mb-0">
                            <div className="flex-1 max-w-[100%]">
                                <h1 className="md:text-right text-center text-4xl md:text-5xl 2xl:text-6xl font-semibold font-cormorant mb-2 text-white">Smart Document Tagging &  <span className="bg-gradient-to-r from-[#38B6FF] to-[#004AAD] bg-clip-text text-transparent">
                                    Instant
                                </span> Summaries</h1>
                                <h1 className="md:text-right text-center text-lg md:text-xl 2xl:text-2xl font-montserrat font-thin text-slate-300">Every document is automatically categorized and condensed, turning complex files into clear, searchable insights in seconds</h1>

                            </div>
                        </div>


                    </div>


                </div>

                <div className="relative flex justify-center flex-col items-center w-full mt-16 pb-16 md:pb-36">

                    <FadeInSlideUp className='flex justify-center items-center flex-col'>
                        <h1 className="text-4xl md:text-5xl font-semibold md:w-[70%] w-[80%] text-center mb-2 font-cormorant text-gray-200">The future of document storage is here. Don&apos;t miss out.</h1>

                    </FadeInSlideUp>
                    <FadeInSlideUp className="flex justify-center items-center flex-col">
                        <h1 className="font-montserrat text-2xl font-thin text-gray-200">Get early access today</h1>
                    </FadeInSlideUp>

                    <div className="flex flex-col pb-8">
                        <div className="flex flex-col lg:flex-row justify-center items-center lg:gap-0 gap-4 text-center w-full mt-4">
                            <div className="flex flex-col md:flex-row justify-center items-center lg:gap-0 md:gap-2 sm:gap-2 gap-3 text-center w-full">
                                <button
                                    onClick={handleRequestDemo}
                                    className="bg-gradient-to-r from-[#1e6aa3] via-[#3148b3] to-[#003580] w-48 lg:w-48 text-white rounded-full py-3 px-6 hover:opacity-90 transition-all"
                                >
                                    Request a Demo
                                </button>
                                <button
                                    onClick={handleContactUs}
                                    className="bg-transparent border border-white w-48 lg:w-48 text-white rounded-full py-3 px-6 ml-2 hover:bg-white hover:text-[#3148b3] transition-all"
                                >
                                    Contact Us
                                </button>
                            </div>
                        </div>

                        <div className="w-full flex flex-col items-center justify-center h-8">
                            {submitErrorBottom && <p className="text-red-500 mt-2 max-w-[60%] text-center">{submitErrorBottom}</p>}
                            {submitSuccessBottom && <p className="text-green-500 mt-2 max-w-[60%] text-center">Thank you for your interest! We&apos;ll be in touch soon.</p>}

                        </div>
                    </div>


                </div>

                <div className="w-full flex justify-center items-center flex-col">
                    <div className="flex flex-row py-6 gap-[48rem]">
                        <div className="flex flex-row items-center">
                            <img src={logo.src} alt="logo" className="md:h-6 md:w-auto w-[10%] h-auto" />
                            <h1 className="font-semibold text-xl sm:text-2xl md:text-lg font-montserrat text-gray-200">Fynopsis</h1>
                        </div>

                        <div className="flex flex-row items-center gap-4">
                            <a href="https://www.linkedin.com/company/fynopsis-ai">
                                <Linkedin className="w-6 h-6 text-white" />
                            </a>
                        </div>
                    </div>


                    <Separator className="bg-gray-700 w-[95%] text-gray-200" />
                    <div className="flex flex-row items-center justify-center gap-6 py-4 px-4 text-gray-500 " >

                        <h1>© 2025 Fynopsis All rights reserved.</h1>
                        <h1>Privacy Policy</h1>
                        <h1>Terms of Service</h1>
                    </div>


                </div>



            </div>
        </div>


    );
};

export default FrontPage;