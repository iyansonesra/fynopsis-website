import { addDays, subYears, format } from 'date-fns';
import { DataPoint, ImportantMarker } from './StockGraph';

function generateRandomStockData(
  numYears: number = 5,
  numMarkers: number = 2
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

  // Generate the specified number of important markers
  const usedIndices = new Set<number>();
  for (let i = 0; i < numMarkers; i++) {
    let markerIndex: number;
    do {
      markerIndex = Math.floor(Math.random() * data.length);
    } while (usedIndices.has(markerIndex));

    usedIndices.add(markerIndex);
    const markerDate = data[markerIndex].name;
    importantMarkers.push({
      date: markerDate,
      label: `Event ${i + 1}`,
      explanation: `This is important event ${i + 1} in the stock's history.`
    });
  }

  // Sort markers by date
  importantMarkers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { data, importantMarkers };
}

export default generateRandomStockData;