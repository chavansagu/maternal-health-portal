import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Color palettes for charts
const CHART_COLORS = {
  primary: 'rgba(54, 162, 235, 0.8)',
  success: 'rgba(75, 192, 192, 0.8)',
  warning: 'rgba(255, 206, 86, 0.8)',
  danger: 'rgba(255, 99, 132, 0.8)',
  info: 'rgba(153, 102, 255, 0.8)',
  secondary: 'rgba(201, 203, 207, 0.8)',
};

const BACKGROUND_COLORS = [
  'rgba(255, 99, 132, 0.6)',
  'rgba(54, 162, 235, 0.6)',
  'rgba(255, 206, 86, 0.6)',
  'rgba(75, 192, 192, 0.6)',
  'rgba(153, 102, 255, 0.6)',
  'rgba(255, 159, 64, 0.6)',
  'rgba(199, 199, 199, 0.6)',
  'rgba(83, 102, 255, 0.6)',
  'rgba(255, 99, 255, 0.6)',
  'rgba(99, 255, 132, 0.6)',
];

const BORDER_COLORS = [
  'rgba(255, 99, 132, 1)',
  'rgba(54, 162, 235, 1)',
  'rgba(255, 206, 86, 1)',
  'rgba(75, 192, 192, 1)',
  'rgba(153, 102, 255, 1)',
  'rgba(255, 159, 64, 1)',
  'rgba(199, 199, 199, 1)',
  'rgba(83, 102, 255, 1)',
  'rgba(255, 99, 255, 1)',
  'rgba(99, 255, 132, 1)',
];

const ChartRenderer = ({ visualization }) => {
  // Validate visualization data
  if (!visualization) {
    console.log('ChartRenderer: No visualization data provided');
    return null;
  }
  
  console.log('ChartRenderer received visualization:', visualization);
  
  // Handle both backend formats
  const chartType = visualization.chart_type || visualization.type || 'bar';
  const title = visualization.title || 'Chart';
  const xAxis = visualization.x_axis;
  const yAxis = visualization.y_axis;
  let chartData = visualization.data;
  
  // Check if data exists
  if (!chartData || (Array.isArray(chartData) && chartData.length === 0)) {
    return (
      <div className="alert alert-info mt-3">
        <h5>{title}</h5>
        <p>No data available for the selected period.</p>
      </div>
    );
  }
  
  // Transform backend data format to Chart.js format
  let transformedData;
  
  // Check if data is already in Chart.js format (has labels and datasets)
  if (chartData.labels && chartData.datasets) {
    console.log('Data already in Chart.js format');
    transformedData = chartData;
  } 
  // Transform raw data array to Chart.js format
  else if (Array.isArray(chartData) && xAxis && yAxis) {
    console.log('Transforming raw data to Chart.js format');
    
    // Extract labels from x_axis field
    const labels = chartData.map(item => {
      const label = item[xAxis];
      // Capitalize first letter
      return typeof label === 'string' 
        ? label.charAt(0).toUpperCase() + label.slice(1)
        : label;
    });
    
    // Extract values from y_axis field
    const values = chartData.map(item => item[yAxis]);
    
    transformedData = {
      labels: labels,
      datasets: [
        {
          label: yAxis.charAt(0).toUpperCase() + yAxis.slice(1),
          data: values,
          backgroundColor: BACKGROUND_COLORS.slice(0, values.length),
          borderColor: BORDER_COLORS.slice(0, values.length),
          borderWidth: 1,
        },
      ],
    };
  } else {
    console.error('Invalid data format:', chartData);
    return (
      <div className="alert alert-warning mt-3">
        <h5>{title}</h5>
        <p>Chart data format is not supported.</p>
        <p className="small text-muted">Expected: Array with x_axis and y_axis fields, or Chart.js format with labels and datasets</p>
      </div>
    );
  }
  
  console.log('Transformed chart data:', transformedData);

  // Default chart options
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        display: chartType.toLowerCase() === 'pie' || chartType.toLowerCase() === 'doughnut',
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        enabled: true,
      },
    },
  };
  
  // Add scales for bar and line charts
  if (chartType.toLowerCase() === 'bar' || chartType.toLowerCase() === 'line') {
    defaultOptions.scales = {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    };
  }

  // Render appropriate chart based on type
  const renderChart = () => {
    try {
      const type = chartType.toLowerCase();
      console.log('Rendering chart type:', type);
      
      switch (type) {
        case 'line':
          return <Line data={transformedData} options={defaultOptions} />;
        case 'bar':
          return <Bar data={transformedData} options={defaultOptions} />;
        case 'pie':
          return <Pie data={transformedData} options={defaultOptions} />;
        case 'doughnut':
          return <Doughnut data={transformedData} options={defaultOptions} />;
        default:
          return <Bar data={transformedData} options={defaultOptions} />;
      }
    } catch (error) {
      console.error('Chart rendering error:', error);
      return (
        <div className="alert alert-danger">
          <h5>Error Rendering Chart</h5>
          <p>{error.message}</p>
          <p className="small text-muted">Check browser console for details.</p>
        </div>
      );
    }
  };

  return (
    <div className="card mt-3">
      <div className="card-body">
        <div style={{ height: '400px' }}>
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default ChartRenderer;
