import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { Link, Link2 } from 'lucide-react';
import { useTheme } from '@mui/material/styles';


// Define the interface for a competitor
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

// Props interface for the CompetitorTable component
interface CompetitorTableProps {
    competitors: Competitor[];
    onCompetitorSelect: (competitor: Competitor) => void;
}

// Styled TableContainer component
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    overflowX: 'auto',
    maxWidth: '100%',
    '&::-webkit-scrollbar': {
        height: '6px',
    },
    '&::-webkit-scrollbar-track': {
        background: theme.palette.grey[200],
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.grey[400],
        borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
        background: theme.palette.grey[500],
    },
}));

const CompetitorTable: React.FC<CompetitorTableProps> = ({ competitors, onCompetitorSelect }) => {
    const theme = useTheme();


    const headerStyle = {
        maxWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: '0.9rem',
    };

    const cellStyle = {
        maxWidth: "50px",
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: '0.7rem',
    };

    const overviewCellStyle = {
        ...cellStyle,
        whiteSpace: 'normal', // Allow text wrapping
        maxHeight: '2rem', // Approximately 3-4 lines (adjust as needed)
        WebkitLineClamp: 3, // Show 3 lines before truncating
        WebkitBoxOrient: 'vertical',
    };

    return (
        <StyledTableContainer component={Paper} className='dark:bg-darkBg dark:text-white' >
            <Table sx={{ width: '150%',}} aria-label="competitor table" >
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ ...headerStyle, width: "50px" }} className='dark:text-white'>Company</TableCell>
                        <TableCell sx={{ ...headerStyle, width: "50px" }} className='dark:text-white' align="right">Type</TableCell>
                        <TableCell sx={{ ...headerStyle, width: "50px" }} align="right" className='dark:text-white'>Employees</TableCell>
                        <TableCell sx={{ ...headerStyle, width: "50px" }} align="right" className='dark:text-white'>Overview</TableCell>
                        <TableCell sx={{ ...headerStyle, width: "50px" }} align="right" className='dark:text-white'>Business Model</TableCell>
                        <TableCell sx={{ ...headerStyle, width: "50px" }} align="right" className='dark:text-white'>Customer Groups</TableCell>
                        <TableCell sx={{ ...headerStyle, width: "50px" }} align="right" className='dark:text-white'>Founded</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {competitors.map((competitor) => (
                        <TableRow
                            key={competitor.name}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 }, height: 'auto', cursor: 'pointer' }}
                            onClick={() => onCompetitorSelect(competitor)}
                        >
                            <TableCell sx={{ ...headerStyle, width: "50px" }}>
                                <div className="flex flex-row items-center gap-4">
                                    <img src={`https://cdn.brandfetch.io/${competitor.url}`} alt="Logos by Brandfetch" className='h-8 w-8 rounded-full' />

                                    <h1 className="text-base dark:text-white">{competitor.name}</h1>
                                    <Link className="h-4 w-4 bg-red-100" color='#000000' />

                                </div>
                            </TableCell>
                            <TableCell align="right" sx={{ ...cellStyle }} className='dark:text-white'>{competitor.type}</TableCell>
                            <TableCell align="right" sx={{ ...cellStyle, width: "50px" }} className='dark:text-white'>{competitor.employees}</TableCell>
                            <TableCell align="right" sx={overviewCellStyle} className='dark:text-white'>{competitor.overview}</TableCell>
                            <TableCell align="right" sx={{ ...cellStyle, width: "50px" }} className='dark:text-white'>{competitor.businessModel}</TableCell>
                            <TableCell align="right" sx={{ ...cellStyle, width: "50px" }} className='dark:text-white'>{competitor.customerGroups}</TableCell>
                            <TableCell align="right" sx={{ ...cellStyle, width: "50px" }} className='dark:text-white'>{competitor.founded}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </StyledTableContainer>
    );
};

export default CompetitorTable;


