import { DataPoint, ImportantMarker } from './StockGraph';

function generateRandomStockData(
  numPoints: number = 30,
  numMarkers: number = 3
): { data: DataPoint[], importantMarkers: ImportantMarker[] } {
  const data: DataPoint[] = [];
  const importantMarkers: ImportantMarker[] = [];

  // Generate random stock data
  let previousValue = 100; // Starting stock value
  for (let i = 0; i < numPoints; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (numPoints - i));
    const formattedDate = date.toISOString().split('T')[0];

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
  }

  // Generate important markers
  const markerIndices = new Set<number>();
  while (markerIndices.size < numMarkers) {
    markerIndices.add(Math.floor(Math.random() * numPoints));
  }

  markerIndices.forEach((index) => {
    const dataPoint = data[index];
    importantMarkers.push({
      x: dataPoint.name,
      label: `Event ${index + 1}`,
      explanation: `This is an important event that occurred on ${dataPoint.name}`
    });
  });

  return { data, importantMarkers };
}

export default generateRandomStockData;