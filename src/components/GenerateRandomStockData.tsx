import { addDays, subYears, format } from 'date-fns';
import { DataPoint, ImportantMarker } from './StockGraph';

function generateRandomStockData(
  numYears: number = 5,
  numMarkers: number = 3
): { data: DataPoint[], importantMarkers: ImportantMarker[] } {
  const endDate = new Date();
  const startDate = subYears(endDate, numYears);
  const data: DataPoint[] = [];
  const importantMarkers: ImportantMarker[] = [];

  let currentDate = startDate;
  let previousValue = 100; // Starting stock value

  while (currentDate <= endDate) {
    const formattedDate = format(currentDate, 'yyyy-MM-dd');

    // Generate a random percentage change between -5% and 5%
    const changePercentage = (Math.random() - 0.5) * 0.1;
    const newValue = previousValue * (1 + changePercentage);

    data.push({
      name: formattedDate,
      uv: Number(newValue.toFixed(2)),
      pv: Math.round(Math.random() * 1000),
      amt: Math.round(Math.random() * 2000)
    });

    previousValue = newValue;
    currentDate = addDays(currentDate, 1);
  }

  // Generate important markers
  const markerIndices = new Set<number>();
  while (markerIndices.size < numMarkers) {
    markerIndices.add(Math.floor(Math.random() * data.length));
  }


  return { data, importantMarkers };
}

export default generateRandomStockData;