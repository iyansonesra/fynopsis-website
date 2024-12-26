"use client";
import Link from "next/link"
import {
    Bell,
    Search,
    Settings as SettingsIcon,
    Factory,
    Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from '../assets/fynopsis_noBG.png'
import { useState, useEffect } from "react"
import StockSearch from "./StockSearch";
import Settings from "./Settings";
import IndustryPage from "./IndustryPage";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Sun, Moon } from "lucide-react";
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { CircularProgress } from "@mui/material";
import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, DoorOpen, Clipboard } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DataRoomCard from "@/components/DataRoomCard";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { post, get, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';




type Tab = {
    icon: LucideIcon;
    label: string;
};

type IndicatorStyle = {
    top?: string;
    height?: string;
};

export default function GeneralDashboard() {
    const [selectedTab, setSelectedTab] = useState("library");
    const { user, signOut } = useAuthenticator((context) => [context.user]);
    const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<number | null>(null);
    const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({} as IndicatorStyle);
    const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [invitedDatarooms, setInvitedDatarooms] = useState<any[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [selectedDataroom, setSelectedDataroom] = useState<string | null>(null);

    const tabs: Tab[] = [
        { icon: DoorOpen, label: 'Rooms' },
    ];

    function signIn(): void {
        router.push('/signin');
    }

    type DataRoom = {
        id: number;
        title: string;
        lastOpened: string;
    };

    const [dataRooms, setDataRooms] = useState<DataRoom[]>([]);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newDataroomName, setNewDataroomName] = useState('');


    const handleDataRoomClick = (name: any) => {
        // console.log(uuid);
        router.push(`/dataroom/${name}`);
    };

    const handleAddDataroom = async () => {
        if (newDataroomName.trim()) {
            try {

                const newRoomName = newDataroomName.trim();
                const restOperation = post({
                    apiName: 'S3_API',
                    path: `/create-data-room`,
                    options: {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: {
                            bucketName: newRoomName
                        },
                        withCredentials: true
                    },
                });

                const { body } = await restOperation.response;
                const responseText = await body.text();
                const responseMain = JSON.parse(responseText);
                console.log(responseMain);

                const newDataroom = {
                    id: responseMain.uuid, // Use UUID from API response
                    title: newDataroomName.trim(),
                    lastOpened: new Date().toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                    })
                };
                setDataRooms([...dataRooms, newDataroom]);
                setIsAddDialogOpen(false);
                setNewDataroomName('');
            } catch (error) {
                console.log("error");
            }
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

    const [isDarkMode, setIsDarkMode] = useState(false);

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
            console.log("error");
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
        try {
            const restOperation = post({
                apiName: 'S3_API',
                path: `/share-folder/${bucketId}/accept-invite`,
                options: {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                },
            });

            await restOperation.response;
            // Remove from invited list and refresh datarooms
            setInvitedDatarooms(invitedDatarooms.filter(room => room.bucketId !== bucketId));
            handleFetchDataRooms();
        } catch (error) {
            console.error('Error accepting invite:', error);
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


    const handleFetchDataRooms = async () => {
        try {
            const { credentials } = await fetchAuthSession();
            if (!credentials) {
                throw new Error('User is not authenticated');
            }

            const restOperation = get({
                apiName: 'S3_API',
                path: '/get-data-rooms',
                options: {
                    withCredentials: true
                }
            });

            const { body } = await restOperation.response;
            const responseText = await body.text();
            console.log(responseText);

            // Parse the response text to JSON
            const response = JSON.parse(responseText);
            const buckets = response.listedBuckets.bucketList;
            const uuids = response.listedUuids.uuidList;
            const invitedBuckets = response.invitedBuckets?.invitedList || {};

            // Map the buckets to the dataRooms format
            const newDataRooms = buckets.map((bucketName: string, index: number) => ({
                id: uuids[index],
                title: bucketName,
                lastOpened: new Date().toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                }),
                createdAt: new Date().toISOString(),
                userId: user?.userId,
                fullBucketName: bucketName
            }));

            // Map the invited buckets to the invitedDatarooms format
            const newInvitedDatarooms = Object.entries(invitedBuckets).map(([bucketId, details]: [string, any]) => ({
                bucketId,
                bucketName: details.bucketName,
                sharedBy: details.sharedBy,
                permissionLevel: details.permissionLevel
            }));

            // Update both states
            setDataRooms(newDataRooms);
            setInvitedDatarooms(newInvitedDatarooms);

        } catch (error) {
            console.error('Error fetching buckets:', error);
        }
    };

    const handleDeleteDataroom = async (dataroomId: string) => {
        try {
            const restOperation = del({
                apiName: 'S3_API',
                path: `/s3/${dataroomId}/delete-room`,
                options: {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                },
            });

            const { body } = await restOperation.response;
            const response = await body.text();
            const result = JSON.parse(response);

            // Remove the dataroom from state
            setDataRooms(dataRooms.filter(room => room.id !== dataroomId));
            setIsDeleteDialogOpen(false);
            setSelectedDataroom(null);
        } catch (error) {
            console.error('Error deleting dataroom:', error);
        }
    };

    const handleLeaveDataroom = async (dataroomId: string) => {
        try {
            const restOperation = post({
                apiName: 'S3_API',
                path: `/s3/${dataroomId}/leave-room`,
                options: {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                },
            });

            const { body } = await restOperation.response;
            const response = await body.text();
            const result = JSON.parse(response);

            // Remove the dataroom from state
            setDataRooms(dataRooms.filter(room => room.id !== dataroomId));
            setIsLeaveDialogOpen(false);
            setSelectedDataroom(null);
        } catch (error) {
            console.error('Error leaving dataroom:', error);
        }
    };


    useEffect(() => {
        if (user) {
            handleFetchUserAttributes();
            handleFetchDataRooms();
        }
    }, [user]);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);
    return (
        userAttributes ?
            <div className="relative h-screen w-full flex flex-row sans-serif">
                <div className="w-20 bg-slate-900 h-full flex flex-col items-center justify-between pt-4 pb-6">
                    <div className="">
                        <img src={logo.src} alt="logo" className="h-14 w-auto mb-8" />
                        <div className="relative flex flex-col items-center">
                            {activeTab !== null && (
                                <div
                                    className="absolute left-0 w-full bg-blue-300 rounded-xl transition-all duration-300 ease-in-out"
                                    style={indicatorStyle}
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
                        <PopoverTrigger className='bg-sky-600 h-10 aspect-square rounded-full'></PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <button
                                onClick={signOut}
                                className="flex items-center space-x-2 px-4 py-2 text-red-500 hover:bg-gray-100 w-full"
                            >
                                <LogOut size={18} />
                                <span>Logout</span>
                            </button>
                        </PopoverContent>
                    </Popover>
                </div>


                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-[2] px-4 py-4">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="font-semibold text-xl">Your Datarooms</h1>
                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Add Dataroom
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            
                                {dataRooms.map((room) => (
                                    <DataRoomCard
                                      key={room.id}
                                      id={room.id}
                                      title={room.title}
                                      lastOpened={room.lastOpened}
                                      onClick={() => handleDataRoomClick(room.id)}
                                    />
                                  ))}
                            
                        </div>

                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Dataroom</DialogTitle>
                                </DialogHeader>
                                <Input
                                    value={newDataroomName}
                                    onChange={(e) => setNewDataroomName(e.target.value)}
                                    placeholder="Enter dataroom name"
                                />
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddDataroom}>Create</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="flex-1 px-4 py-4">
                        <h1 className="font-semibold text-xl">Recent Activity</h1>

                    </div>
                    <div className="w-64 border-l border-gray-200 p-4 overflow-y-auto">
                        <h2 className="font-semibold text-lg mb-4">Pending Invites</h2>
                        {invitedDatarooms.length > 0 ? (
                            invitedDatarooms.map((room) => (
                                <div
                                    key={room.bucketId}
                                    className="bg-white rounded-lg shadow p-4 mb-3 border border-gray-100"
                                >
                                    <h3 className="font-medium text-sm">{room.bucketName}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
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
                            <p className="text-sm text-gray-500">No pending invites</p>
                        )}
                    </div>
                </div>
            </div > :
            <div className="grid h-screen place-items-center">
                <CircularProgress value={0.5} />
            </div>
    );
}

