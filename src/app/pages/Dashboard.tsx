"use client";
import Link from "next/link"
import {
    Bell,
    Search,
    Settings as SettingsIcon,
    Factory,
    Plus,
    LucideIcon,
    Library,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from './../assets/fynopsis_noBG.png'

import { useState, useEffect, Key } from "react"
// import StockSearch from "./StockSearch";
import Settings from "./Settings";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Sun, Moon } from "lucide-react";
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { CircularProgress } from "@mui/material";
import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, DoorOpen, Clipboard } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DataRoomCard from "@/components/tabs/misc/DataRoomCard";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { post, get, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Separator } from "@radix-ui/react-separator";




type Tab = {
    icon: LucideIcon;
    label: string;
};

type IndicatorStyle = {
    top?: string;
    height?: string;
};

type DataRoom = {
    id: string | null | undefined;
    title: string;
    lastOpened: string;
    bucketName: string;
    uuid: string;
    permissionLevel: string;
    sharedBy?: string;
    addedAt: string;
    users?: sharedUser[];
};

type InvitedRoom = {
    bucketName: string;
    uuid: string;
    permissionLevel: string;
    sharedBy: string;
    sharedAt: string;
};

interface sharedUser {
    email: string;
    name: string;
    role: string;
}

const SkeletonCard = () => (
    <div className="w-full h-[160px] bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse">
        <div className="p-4 space-y-3">
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
    </div>
);

const SkeletonInvite = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-3 animate-pulse w-full">
        <div className="space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="flex gap-2 mt-3">
                <div className="h-6 w-6 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                <div className="h-6 w-6 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>
        </div>
    </div>
);

export default function GeneralDashboard() {
    const [selectedTab, setSelectedTab] = useState("library");
    const router = useRouter();
    const { user, signOut } = useAuthenticator((context) => [context.user]);
    const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<number | null>(0);
    const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({} as IndicatorStyle);
    const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [invitedDatarooms, setInvitedDatarooms] = useState<any[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [selectedDataroom, setSelectedDataroom] = useState<string | null>(null);
    const [isInvitesLoading, setIsInvitesLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
    const [confirmationName, setConfirmationName] = useState('');
    const [pendingAcceptBucketId, setPendingAcceptBucketId] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);

    const tabs: Tab[] = [
        { icon: Library, label: 'Library' },
    ];

    function signIn(): void {
        router.push('/signin');
    }

    const [dataRooms, setDataRooms] = useState<DataRoom[]>([]);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newDataroomName, setNewDataroomName] = useState('');
    const [familyName, setFamilyName] = useState('');
    const [givenName, setGivenName] = useState('');


    const handleDataRoomClick = (id: string | null | undefined) => {
        router.push(`/dataroom/${id}/home`);
    };

    const handleAddDataroom = async () => {
        if (isCreating) return;
        if (dataRooms.length >= 8) {
            alert("You have reached the maximum limit of 8 datarooms");
            return;
        }

        const newDataroomNameExist = newDataroomName.trim();
        if (newDataroomNameExist) {
            setIsCreating(true);
            try {
                const restOperation = post({
                    apiName: 'S3_API',
                    path: '/create-data-room',
                    options: {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: {
                            bucketName: newDataroomNameExist
                        },
                        withCredentials: true
                    }
                });

                const { body } = await restOperation.response;
                const responseText = await body.text();
                const response = JSON.parse(responseText);

                const newDataroom: DataRoom = {
                    bucketName: newDataroomNameExist,
                    uuid: response.uuid,
                    permissionLevel: 'OWNER',
                    addedAt: new Date().toISOString(),
                    sharedBy: user.username,
                    id: response.uuid,
                    title: response.bucketName,
                    lastOpened: 'Never Opened'
                };

                setDataRooms([...dataRooms, newDataroom]);
                setIsAddDialogOpen(false);
                setNewDataroomName('');
            } catch (error) {
                console.error('Error creating data room:', error);
            } finally {
                setIsCreating(false);
            }
        }
    };

    const handleFetchDataRooms = async () => {
        setIsLoading(true);
        try {
            const { credentials } = await fetchAuthSession();
            if (!credentials) {
                throw new Error('User is not authenticated');
            }

            const restOperation = get({
                apiName: 'S3_API',
                path: '/get-data-rooms',
                options: {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                }
            });

            const { body } = await restOperation.response;
            const responseText = await body.text();
            const response = JSON.parse(responseText);


            // Update data rooms from the response
            const newDataRooms = response.buckets.map((room: DataRoom) => ({
                id: room.uuid,
                title: room.bucketName,
                lastOpened: new Date(room.addedAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                }),
                permissionLevel: room.permissionLevel,
                sharedBy: room.sharedBy,
                users: room.users
            }));

            // Update invited rooms from the response
            const newInvitedDatarooms = response.invited.map((room: InvitedRoom) => ({
                bucketId: room.uuid,
                bucketName: room.bucketName,
                sharedBy: room.sharedBy,
                permissionLevel: room.permissionLevel,
                sharedAt: room.sharedAt
            }));

            setDataRooms(newDataRooms);
            setInvitedDatarooms(newInvitedDatarooms);

        } catch (error) {
            console.error('Error fetching data rooms:', error);
        } finally {
            setIsLoading(false);
            setIsInvitesLoading(false);
        }
    };

    function handleTabClick(index: number): void {
        setActiveTab(index);
        setSelectedTab(tabs[index].label.toLowerCase());
    }

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

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('color-theme') === 'dark';
        }
        return true;
    });

    useEffect(() => {
        if (user) {
            handleFetchUserAttributes();
        }
    }, [user]);

    async function handleFetchUserAttributes() {
        try {
            const attributes = await fetchUserAttributes();
            setUserAttributes(attributes);
            setFamilyName(attributes.family_name || '');
            setGivenName(attributes.given_name || '');
        } catch (error) {
        }
    }


    // const fetchInvitedDatarooms = async () => {
    //     try {
    //         const restOperation = get({
    //             apiName: 'S3_API',
    //             path: '/get-invited-datarooms',
    //             options: {
    //                 withCredentials: true
    //             }
    //         });

    //         const { body } = await restOperation.response;
    //         const responseText = await body.text();
    //         const response = JSON.parse(responseText);
    //         setInvitedDatarooms(response.invitedDatarooms || []);
    //     } catch (error) {
    //         console.error('Error fetching invited datarooms:', error);
    //     }
    // };

    const handleAcceptInvite = async (bucketId: string) => {
        setPendingAcceptBucketId(bucketId);
        setConfirmationName('');
        setIsAcceptDialogOpen(true);
    };

    const handleConfirmAccept = async () => {
        if (!pendingAcceptBucketId) return;
        
        const fullName = `${givenName} ${familyName}`;
        if (confirmationName !== fullName) return;
        
        setIsAccepting(true);
        try {
            const restOperation = post({
                apiName: 'S3_API',
                path: `/share-folder/${pendingAcceptBucketId}/accept-invite`,
                options: {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                },
            });

            await restOperation.response;
            // Remove from invited list and refresh datarooms
            setInvitedDatarooms(invitedDatarooms.filter(room => room.bucketId !== pendingAcceptBucketId));
            handleFetchDataRooms();
            setIsAcceptDialogOpen(false);
            setPendingAcceptBucketId(null);
        } catch (error) {
            console.error('Error accepting invite:', error);
        } finally {
            setIsAccepting(false);
        }
    };

    const handleDeclineInvite = async (bucketId: string) => {
        try {
            const restOperation = post({
                apiName: 'S3_API',
                path: `/share-folder/${bucketId}/decline-invite`,
                options: {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                },
            });

            await restOperation.response;
            // Remove from invited list
            setInvitedDatarooms(invitedDatarooms.filter(room => room.bucketId !== bucketId));
        } catch (error) {
            console.error('Error declining invite:', error);
        }
    };



    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
    };



    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    useEffect(() => {
        async function initializeDashboard() {
            try {
                await handleFetchUserAttributes();
                await handleFetchDataRooms();
            } catch (error) {
                console.error('Error initializing dashboard:', error);
            } finally {
                setIsLoading(false);
            }
        }
        
        if (user) {
            initializeDashboard();
        }
    }, [user]);

    async function handleSignOut() {
        try {
            await signOut();
            router.replace('/signin');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    return (
        isLoading ? (
            <div className="grid h-screen place-items-center dark:bg-darkbg">
                <CircularProgress value={0.5} />
            </div>
        ) : userAttributes ?
            <div className="relative h-screen w-full flex flex-row sans-serif">
                <div className="w-20 bg-slate-900 h-full flex flex-col items-center justify-between pt-4 pb-6">
                    <div className="">
                        <img src={logo.src} alt="logo" className="h-14 w-auto mb-8" />
                        <div className="relative flex flex-col items-center">
                            {activeTab !== null && (
                                <div
                                    className="absolute left-0 w-full bg-blue-300 rounded-xl transition-all duration-300 ease-in-out z-0"
                                    style={{
                                        top: `${tabRefs.current[activeTab]?.offsetTop || 0}px`,
                                        height: `${tabRefs.current[activeTab]?.offsetHeight || 0}px`
                                    }}
                                />
                            )}
                            {tabs.map((tab, index) => (
                                <div
                                    key={tab.label}
                                    ref={(el) => { tabRefs.current[index] = el }}
                                    className={`relative z-10 p-2 mb-4 cursor-pointer ${activeTab === index ? 'text-slate-900' : 'text-white'
                                        }`}
                                    onClick={() => handleTabClick(index)}
                                >
                                    <tab.icon size={24} />
                                </div>
                            ))}
                        </div>

                    </div>

                    <Popover>
                        <PopoverTrigger className='bg-sky-600 h-10 aspect-square rounded-full text-gray-200'>
                            {userAttributes?.given_name && userAttributes?.family_name
                                ? (givenName[0] + familyName[0]).toUpperCase()
                                : 'U'}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <button
                                onClick={handleSignOut}
                                className="flex items-center space-x-2 px-4 py-2 text-red-500 hover:bg-gray-100 w-full text-sm"
                            >
                                <LogOut size={14} />
                                <span>Logout</span>
                            </button>
                            <Separator orientation="horizontal" />
                            <button
                                onClick={toggleDarkMode}
                                className="flex items-center space-x-2 px-4 py-2 text-red-500 hover:bg-gray-100 w-full text-sm gap-2"
                            >
                                {isDarkMode ? '🌙' : '☀️'}
                                {isDarkMode ? <span className="text-black">Dark</span> : <span className="text-black">Light</span>}
                            </button>

                        </PopoverContent>

                    </Popover>
                </div>


                <div className="flex-1 overflow-hidden flex flex-row dark:bg-darkbg">
                    <div className="flex-[2] px-4 py-4">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex flex-row gap-2 items-center ml-2">
                                <Library className="w-6 h-6 dark:text-gray-200" />
                                <h1 className="font-semibold text-xl dark:text-white">Your Datarooms</h1>
                            </div>

                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Add Dataroom
                            </Button>
                        </div>
                        <div className="flex flex-col">
                            {isLoading ? (
                                <div className="flex flex-col gap-2">
                                    <SkeletonCard />
                                    <SkeletonCard />
                                    <SkeletonCard />
                                </div>
                            ) : (
                                dataRooms.map((room) => (
                                    <div key={room.id} className="w-full">
                                        <DataRoomCard
                                            id={room.id || ''}
                                            title={room.title}
                                            users={room.users || []}
                                            lastOpened={room.lastOpened}
                                            permissionLevel={room.permissionLevel}
                                            sharedBy={room.sharedBy || ''}
                                            onClick={() => handleDataRoomClick(room.id)}
                                            onDelete={() => {
                                                setDataRooms(dataRooms.filter(r => r.id !== room.id));
                                            }}
                                            onLeave={() => {
                                                setDataRooms(dataRooms.filter(r => r.id !== room.id));
                                            }}
                                        />
                                    </div>
                                ))
                            )}
                        </div>



                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogContent className="dark:bg-darkbg dark:text-white border-none">
                                <DialogHeader>
                                    <DialogTitle>Create New Dataroom</DialogTitle>
                                </DialogHeader>
                                <Input
                                    value={newDataroomName}
                                    onChange={(e) => setNewDataroomName(e.target.value)}
                                    placeholder="Enter dataroom name"
                                    className="outline-none select-none dark:bg-darkbg dark:text-white"
                                    disabled={isCreating}
                                />
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsAddDialogOpen(false)}
                                        className="dark:bg-darkbg dark:border dark:hover:text-slate-400"
                                        disabled={isCreating}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleAddDataroom}
                                        className="dark:hover:text-slate-400"
                                        disabled={isCreating}
                                    >
                                        {isCreating ? (
                                            <span className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creating...
                                            </span>
                                        ) : (
                                            'Create'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Separator orientation="vertical" className="h-full dark:text-gray-200" />
                    <div className="flex-1 px-4 py-4 flex flex-col h-full">
                        <div className="flex min-h-[50%] mb-4 flex-col">
                            <h1 className="font-semibold text-xl mb-4 dark:text-white">Recent Activity</h1>
                            <p className="text-sm text-gray-500 dark:text-white">No Recent Activity</p>

                        </div>

                        <div className="flex min-h-[50%]  mb-4 flex-col">

                            <h2 className="font-semibold text-lg mb-4 dark:text-white">Pending Invites</h2>
                            {isInvitesLoading ? (
                                <>
                                    <SkeletonInvite />
                                    <SkeletonInvite />
                                </>
                            ) : invitedDatarooms.length > 0 ? (
                                invitedDatarooms.map((room) => (
                                    <div
                                        key={room.bucketId}
                                        className="bg-white  dark:bg-gray-800 rounded-lg shadow p-4 mb-3 border border-gray-100 dark:border-none"
                                    >
                                        <h3 className="font-medium text-sm dark:text-white">{room.bucketName}</h3>
                                        <p className="text-xs text-gray-500 mt-1 dark:text-slate-300">
                                            Shared by: {room.sharedBy}
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => handleAcceptInvite(room.bucketId)}
                                                className="flex items-center justify-center p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeclineInvite(room.bucketId)}
                                                className="flex items-center justify-center p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-white">No pending invites</p>
                            )}

                        </div>
                    </div>
                </div>

                {/* Accept Dataroom Confirmation Dialog */}
                <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
                    <DialogContent className="dark:bg-darkbg dark:text-white border-none">
                        <DialogHeader>
                            <DialogTitle>Confirm Access</DialogTitle>
                        </DialogHeader>
                        <div className="my-4">
                            <p className="text-sm mb-4 dark:text-slate-300">
                                By accessing this dataroom, you agree to maintain the confidentiality of all information contained within. 
                            </p>
                            <p className="text-sm font-medium mb-2 dark:text-white">Enter your full name below:</p>
                            <Input
                                value={confirmationName}
                                onChange={(e) => setConfirmationName(e.target.value)}
                                placeholder={`${givenName} ${familyName}`}
                                className="outline-none select-none dark:bg-darkbg dark:text-white"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && confirmationName === `${givenName} ${familyName}` && !isAccepting) {
                                        handleConfirmAccept();
                                    }
                                }}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsAcceptDialogOpen(false);
                                    setPendingAcceptBucketId(null);
                                }}
                                className="dark:bg-darkbg dark:border dark:hover:text-slate-400"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmAccept}
                                disabled={confirmationName !== `${givenName} ${familyName}` || isAccepting}
                                className="dark:hover:text-slate-400"
                            >
                                {isAccepting ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Accepting...
                                    </span>
                                ) : (
                                    'Accept & Join'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div> :
            <div className="grid h-screen place-items-center dark:bg-darkbg">
                <CircularProgress value={0.5} />
            </div>
    );
}