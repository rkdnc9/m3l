import React from 'react';
import Visualization from './Visualization';
import { DataPoint } from '../src/types/visualization';

interface ResultsPaneProps {
  data: DataPoint[];
  shouldVisualize: boolean;
  question: string;
}

const ResultsPane: React.FC<ResultsPaneProps> = ({ data, shouldVisualize, question }) => {
  if (!data || data.length === 0) {
    return <div>No results found</div>;
  }

  if (shouldVisualize) {
    return <Visualization data={data} question={question} />;
  }

  // Your existing table rendering code
  return (
    <table>
      <thead>
        <tr>
          {Object.keys(data[0]).map((key) => (
            <th key={key}>{key}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {Object.values(row).map((value, j) => (
              <td key={j}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ResultsPane; 