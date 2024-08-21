import Industry from '@/components/Industry';
import React, { useEffect, useState } from 'react';


export default function IndustryPage({ setSelectedTab }) {

    const handleTabChange = (tab) => {
        if (setSelectedTab) {
            setSelectedTab(tab);
        }
    };

    return (
        <div className = "flex flex-col h-screen w-full">
            <Industry industryName={'Mobile Phones'} company='Nvidia'>
                
            </Industry>
        </div>
    );
}