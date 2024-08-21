import React, { useState } from 'react';
import logo from '../app/assets/fynopsis_noBG.png'
import { Select, MenuItem, FormControl } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Separator } from './ui/separator';
import CompanyListing from './CompanyListing';
import RegInnov from './RegInnov';


interface GPTResponseProps {
    industryName: string;
    company: string;
}


const StyledSelect = styled(Select)(({ theme }) => ({
    '&.MuiInputBase-root': {
        border: 'none',
        '&:before, &:after': {
            display: 'none',
        },
    },
    '& .MuiSelect-select': {
        padding: '0 10px 0 0', // Add some padding to the right for the dropdown icon
        color: theme.palette.primary.main,
        '&:focus': {
            background: 'none',
        },
        fontSize: '0.875rem', // Equivalent to text-sm in Tailwind
        lineHeight: '1.25rem',
        fontWeight: 500,
    },
    '& .MuiOutlinedInput-notchedOutline': {
        border: 'none',
    },
    '& .MuiSelect-icon': {
        display: 'none',
    },
}));

const TimeSelector = () => {
    const [timeFrame, setTimeFrame] = useState('24 hours');

    const handleChange = (event) => {
        setTimeFrame(event.target.value);
    };

    return (
        <FormControl sx={{ m: 0, minWidth: 80, }} className='dark:bg-slate-900'>
            <StyledSelect
                value={timeFrame}
                onChange={handleChange}
                displayEmpty
                inputProps={{ 'aria-label': 'Without label' }}
                className='dark:bg-slate-900'
            >
                <MenuItem value="24 hours" style={{ fontSize: '0.875rem' }}>24 hours</MenuItem>
                <MenuItem value="30 days" style={{ fontSize: '0.875rem' }}>30 days</MenuItem>
                <MenuItem value="6 months" style={{ fontSize: '0.875rem' }}>6 months</MenuItem>
                <MenuItem value="year" style={{ fontSize: '0.875rem' }}>year</MenuItem>
            </StyledSelect>
        </FormControl>
    );
};


const Industry: React.FC<GPTResponseProps> = ({
    industryName,
    company
}) => {
    return (
        <div className='w-full h-full flex flex-col  py-12 px-4 2xl:py-12 2xl:px-12 font-montserrat gap-4'>
            <h1 className="text-3xl font-bold 2xl:text-4xl">{industryName} </h1>

            <div className="flex flex-row">
                <div className="flex flex-[2] flex-col w-[66%]">
                    <p className="text-sm  2xl:text-lg flex items-center text-slate-500 mb-2">
                        In the last&nbsp; <TimeSelector />
                    </p>

                    <p className='text-sm 2xl:text-lg w-[95%]'>
                        Apple Inc. is a leading American technology company known for designing, manufacturing, and selling consumer electronics, software, and online services. Founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne. Apple Inc. is a leading American technology company known for designing, manufacturing, and selling consumer electronics, software, and online services. Founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne.
                    </p>
                </div>

                <div className="flex flex-[1] flex-row w-[33%] items-center justify-center gap-[30%]">
                    <div className="flex   flex-col items-center justify-center gap-4 ">
                        <h1 className="px-6 py-1 bg-slate-100 dark:bg-slate-800 rounded-full 2xl:text-2xl">CAGR</h1>
                        <h1 className="text-4xl font-bold 2xl:text-5xl">109B</h1>
                    </div>

                    <div className="flex   flex-col items-center justify-center gap-4">
                        <h1 className="px-6 py-1 bg-slate-100 dark:bg-slate-800 rounded-full 2xl:text-2xl">CAGR</h1>
                        <h1 className="text-4xl font-bold 2xl:text-5xl">109B</h1>
                    </div>

                </div>

            </div>

            <div className="flex flex-row">
                <div className="flex-[2] w-[66%]">
                    <h1 className="font-semibold mb-1 2xl:text-xl">Major Players</h1>
                    <Separator className="w-36 mb-4"></Separator>
                    <div className="w-full flex-wrap flex gap-x-12 gap-y-10 mb-12">
                        <CompanyListing url="apple.com" name="Apple" numEmployees="1K"></CompanyListing>
                        <CompanyListing url="nvidia.com" name="Nvidia" numEmployees="1K"></CompanyListing>
                        <CompanyListing url="huawei.com" name="Huawai" numEmployees="1K"></CompanyListing>
                        <CompanyListing url="samsung.com" name="Samsung" numEmployees="1K"></CompanyListing>
                        <CompanyListing url="google.com" name="Google" numEmployees="1K"></CompanyListing>
                    </div>

                    <h1 className="font-bold mb-1 2xl:text-xl">Similar Companies to...</h1>
                    <Separator className="w-36 mb-4"></Separator>
                    <div className="w-full flex-wrap flex gap-x-12 gap-y-6 mb-6">
                        <CompanyListing url="apple.com" name="Apple" numEmployees="1K"></CompanyListing>
                        <CompanyListing url="nvidia.com" name="Nvidia" numEmployees="1K"></CompanyListing>
                        <CompanyListing url="huawei.com" name="Huawai" numEmployees="1K"></CompanyListing>
                        <CompanyListing url="samsung.com" name="Samsung" numEmployees="1K"></CompanyListing>
                        <CompanyListing url="google.com" name="Google" numEmployees="1K"></CompanyListing>
                    </div>
                </div>

                <div className="flex-[1] w-[33%]">
                    <h1 className="font-semibold mb-1 2xl:text-xl">Regulations & Innovations</h1>
                    <Separator className="w-56 mb-1"></Separator>
                    <RegInnov type={'Innovation'} date={'8/01/2024'} info={'Apple Inc. is a leading American technology company known for designing, manufacturing, and selling consumer electronics, software, and online services.'}></RegInnov>
                    <RegInnov type={'Regulation'} date={'8/01/2024'} info={'Apple Inc. is a leading American technology company known for designing, manufacturing, and selling consumer electronics, software, and online services.'}></RegInnov>
                    <RegInnov type={'Regulation'} date={'8/01/2024'} info={'Apple Inc. is a leading American technology company known for designing, manufacturing, and selling consumer electronics, software, and online services.'}></RegInnov>
                    <RegInnov type={'Innovation'} date={'8/01/2024'} info={'Apple Inc. is a leading American technology company known for designing, manufacturing, and selling consumer electronics, software, and online services.'}></RegInnov>

                </div>
            </div>
        </div>
    );
};

export default Industry;