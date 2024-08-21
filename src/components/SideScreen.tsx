import React from 'react';
import { Drawer, IconButton, Typography, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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

interface SideScreenProps {
    competitor: Competitor | null;
    open: boolean;
    onClose: () => void;
  }
  
  const SideScreen: React.FC<SideScreenProps> = ({ competitor, open, onClose }) => {
    const handleContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
      };
      
    return (
        <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        variant="persistent"
        sx={{
          '& .MuiDrawer-paper': {
            width: '400px',
            padding: '20px',
            boxShadow: '-4px 0 10px rgba(0, 0, 0, 0.1)',
            zIndex: 1200,
          },
          '& .MuiBackdrop-root': {
            backgroundColor: 'transparent',
          },
        }}
      >
        {competitor && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">{competitor.name}</Typography>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Typography><strong>Type:</strong> {competitor.type}</Typography>
            <Typography><strong>URL:</strong> {competitor.url}</Typography>
            <Typography><strong>Employees:</strong> {competitor.employees}</Typography>
            <Typography><strong>Overview:</strong> {competitor.overview}</Typography>
            <Typography><strong>Business Model:</strong> {competitor.businessModel}</Typography>
            <Typography><strong>Customer Groups:</strong> {competitor.customerGroups}</Typography>
            <Typography><strong>Founded:</strong> {competitor.founded}</Typography>
          </Box>
        )}
      </Drawer>
    );
  };
  
  export default SideScreen;