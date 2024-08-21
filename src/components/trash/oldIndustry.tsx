import React from 'react';
import { Select, SelectContent, SelectGroup, SelectTrigger, SelectItem, SelectValue, SelectLabel } from './ui/select';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { AccordionActions, Button, styled } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CompetitorTable from './CompetitorTable';
import SideScreen from './SideScreen';
import { MuiThemeProvider } from './../components/theme/MUITheme'; // Adjust the import path as needed


interface Competitor {
    name: string;
    type: string;
    url: string;
    employees: number;
    overview: string;
    businessModel: string;
    customerGroups: string;
    founded: number;
}

const FlatAccordion = styled(Accordion)(({ theme }) => ({
    boxShadow: 'none',
    '&:before': {
        display: 'none',
    },
    borderBottom: `1px solid ${theme.palette.divider}`,
}));


interface IndustryProps {
    industryName: string;
    companyName: string;
}

const Industry: React.FC<IndustryProps> = ({
    industryName,
    companyName
}) => {
    const competitors = [
        {
            name: 'NVIDIA',
            url: 'nvidia.com',
            type: 'Corporation',
            employees: 1000,
            overview: 'Nvidia is an American multinational technology company incorporated in Delaware and based in Santa Clara, California.',
            businessModel: 'B2B',
            customerGroups: 'Enterprise',
            founded: 2000
        },
        {
            name: 'Google',
            url: 'google.com',
            type: 'Corporation',
            employees: 1000,
            overview: 'Google is a multinational technology company that specializes in Internet-related services and products',
            businessModel: 'B2B',
            customerGroups: 'Enterprise',
            founded: 2000
        },
        // ... add more competitor objects as needed
    ];

    const [selectedCategory, setSelectedCategory] = React.useState("Competitive Landscape");
    const [selectedCompetitor, setSelectedCompetitor] = React.useState<Competitor | null>(null);
    const [sideScreenOpen, setSideScreenOpen] = React.useState(false);

    const handleCompetitorSelect = (competitor: Competitor) => {
        setSelectedCompetitor(competitor);
        setSideScreenOpen(true);
    };

    const handleSideScreenClose = () => {
        setSideScreenOpen(false);
    };

    const handleOverlayClick = () => {
        setSideScreenOpen(false);
    };


    return (


  
            <div className='w-full h-full flex flex-col py-12 px-4 2xl:py-12 2xl:px-12 font-montserrat gap-4' style={{ overflow: 'auto' }}>
                <div className="flex-row flex gap-8 inline-block">
                    <h1 className="text-3xl font-semibold">{industryName}</h1>
                    <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                        <SelectTrigger className="px-4 gap-2 rounded-full py-0 text-xs outline-none border-none flex w-[250px]">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="Industry Overview">Industry Overview</SelectItem>
                                <SelectItem value="Competitive Landscape">Competitive Landscape</SelectItem>
                                <SelectItem value="Regulations & Innovations">Regulations & Innovations</SelectItem>


                            </SelectGroup>
                        </SelectContent>
                    </Select>

                </div>

                {selectedCategory === "Competitive Landscape" && (
                    <div>
                        <FlatAccordion defaultExpanded className='dark:bg-darkBg dark:text-white dark:border-slate-50'>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="panel1-content"
                                id="panel1-header"
                            
                            >
                                Major Players
                            </AccordionSummary>
                            <AccordionDetails className="p-0 m-0">
                                <CompetitorTable
                                    competitors={competitors}
                                    onCompetitorSelect={handleCompetitorSelect}
                                />
                            </AccordionDetails>
                        </FlatAccordion>
                        <FlatAccordion className='dark:bg-darkBg dark:text-white dark:border-white'>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="panel1-content"
                                id="panel1-header"
                            >
                                GPU Manufacturers
                            </AccordionSummary>
                            <AccordionDetails className="p-0 m-0">
                                <CompetitorTable
                                    competitors={competitors}
                                    onCompetitorSelect={handleCompetitorSelect}
                                />
                            </AccordionDetails>
                        </FlatAccordion>
                        <FlatAccordion className='dark:bg-darkBg dark:text-white dark:border-white'>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="panel1-content"
                                id="panel1-header"
                            >
                                AI and ML Platforms
                            </AccordionSummary>
                            <AccordionDetails className="p-0 m-0">
                                <CompetitorTable
                                    competitors={competitors}
                                    onCompetitorSelect={handleCompetitorSelect}
                                />
                            </AccordionDetails>
                        </FlatAccordion>
                        <FlatAccordion className='dark:bg-darkBg dark:text-white dark:border-white'>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="panel1-content"
                                id="panel1-header"
                            >
                                Specialized AI Hardware
                            </AccordionSummary>
                            <AccordionDetails className="p-0 m-0">
                                <CompetitorTable
                                    competitors={competitors}
                                    onCompetitorSelect={handleCompetitorSelect}
                                />
                            </AccordionDetails>
                        </FlatAccordion>
                    </div>
                )}

                {sideScreenOpen && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'transparent',
                            zIndex: 1100,
                        }}
                        onClick={handleOverlayClick}
                    />
                )}

                <SideScreen
                    competitor={selectedCompetitor}
                    open={sideScreenOpen}
                    onClose={handleSideScreenClose}
                />



            </div>
 

    );
};

export default Industry;