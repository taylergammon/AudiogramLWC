import { LightningElement, api } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import ChartJS from '@salesforce/resourceUrl/ChartJS';
import getAudiogramData from '@salesforce/apex/AudiogramController.getAudiogramData';

export default class AudiogramChart extends LightningElement {
    @api recordId; // Record ID from Salesforce record page
    chart; // Holds the Chart.js instance
    isChartInitialized = false; // Prevent multiple initializations

    // Lifecycle hook: Called after the component renders
    renderedCallback() {
        console.log('Inside renderedCallback...');
        if (this.isChartInitialized) {
            console.log('Chart already initialized. Skipping library load.');
            return; // Prevent reloading Chart.js library multiple times
        }
        this.isChartInitialized = true;

        console.log('Loading Chart.js library...');
        loadScript(this, ChartJS)
            .then(() => {
                console.log('Chart.js library loaded successfully.');
                this.fetchAudiogramData(); // Fetch audiogram data after loading Chart.js
            })
            .catch((error) => {
                console.error('Error loading Chart.js library:', error);
            });
    }

    // Fetch audiogram data from Apex
    fetchAudiogramData() {
        console.log('Fetching audiogram data for recordId:', this.recordId);

        // Check if recordId is available
        if (!this.recordId) {
            console.error('Record ID is null or undefined.');
            return;
        }

        getAudiogramData({ hearingTestId: this.recordId })
            .then((data) => {
                console.log('Fetched audiogram data from Apex:', JSON.stringify(data));

                if (data) {
                    // Log the raw data returned from Apex
                    console.log('Raw Apex Data:', data);

                    // Parse audiogram data into arrays for Chart.js
                    const leftEarData = [
                        data.L_250_Hz ?? null, data.L_500_Hz ?? null, data.L_1K_Hz ?? null,
                        data.L_2K_Hz ?? null, data.L_3K_Hz ?? null, data.L_4K_Hz ?? null, data.L_6K_Hz ?? null
                    ];
                    const rightEarData = [
                        data.R_250_Hz ?? null, data.R_500_Hz ?? null, data.R_1K_Hz ?? null,
                        data.R_2K_Hz ?? null, data.R_3K_Hz ?? null, data.R_4K_Hz ?? null, data.R_6K_Hz ?? null
                    ];

                    // Log parsed data
                    console.log('Parsed Left Ear Data:', leftEarData);
                    console.log('Parsed Right Ear Data:', rightEarData);

                    this.initializeChart(leftEarData, rightEarData); // Initialize the chart with fetched data
                } else {
                    console.error('No audiogram data returned from Apex.');
                }
            })
            .catch((error) => {
                console.error('Error fetching audiogram data from Apex:', error);
            });
    }

    // Initialize the Chart.js chart
    initializeChart(leftEarData, rightEarData) {
        console.log('Initializing Chart.js with data...');
        console.log('Left Ear Data:', leftEarData);
        console.log('Right Ear Data:', rightEarData);

        const canvas = this.template.querySelector('canvas');

        if (!canvas) {
            console.error('Canvas element not found!');
            return;
        }

        const ctx = canvas.getContext('2d');

        // Destroy any existing chart instance to avoid duplicates
        if (this.chart) {
            console.log('Destroying existing chart instance...');
            this.chart.destroy();
        }
        // Custom plugin for shading severity levels
    const shadingPlugin = {
        id: 'severityShading',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            const yScale = chart.scales.y;
            const xScale = chart.scales.x;
            const chartArea = chart.chartArea;

            const severityRanges = [
                { min: -10, max: 25, color: 'rgba(0, 255, 0, 0.2)' }, // Green for normal
                { min: 25, max: 55, color: 'rgba(255, 255, 0, 0.2)' }, // Yellow for mild/moderate
                { min: 55, max: 70, color: 'rgba(255, 165, 0, 0.2)' }, // Orange for moderate/severe
                { min: 70, max: 90, color: 'rgba(255, 69, 0, 0.2)' }, // Blood orange for severe
                { min: 90, max: 120, color: 'rgba(255, 0, 0, 0.2)' }  // Red for profound
            ];

            severityRanges.forEach((range) => {
                const yStart = yScale.getPixelForValue(range.max);
                const yEnd = yScale.getPixelForValue(range.min);
                ctx.fillStyle = range.color;
                ctx.fillRect(chartArea.left, yStart, chartArea.right - chartArea.left, yEnd - yStart);
            });
        }
    };

    // Register the custom plugin
    Chart.register(shadingPlugin);
        // Create a new Chart.js instance
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['250 Hz', '500 Hz', '1K Hz', '2K Hz', '3K Hz', '4K Hz', '6K Hz'],
                datasets: [
                    { data: leftEarData },
                    { data: rightEarData }],
                datasets: [
                    {
                        label: 'Left Ear (O)',
                        data: leftEarData,
                        borderColor: 'blue',
                        borderWidth: 2,
                        borderDash: [5, 5], // Dashed line for left ear
                        pointFill: false,
                        pointStyle: 'circle',
                        pointRadius: 10,
                        tension: 0
                    },
                    {
                        label: 'Right Ear (X)',
                        data: rightEarData,
                        borderColor: 'red',
                        borderWidth: 2,
                        borderDash: [5, 5], // Dashed line for right ear
                        pointStyle: 'crossRot',
                        pointRadius: 10,
                        pointBackgroundColor: 'red',
                        tension: 0
                    },
                ],
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: -10,
                        max: 120,
                        reverse: true,
                        ticks: {
                            padding: 10,
                            stepSize: 10,
                            callback: (value) => `${value} dB`,
                        },
                        title: {
                            display: true,
                            text: 'Hearing Level (dB)',
                        },
                        grid: {
                            color: (context) => {
                                // Make the zero line bold
                                return context.tick.value === 1 ? 'black' : '#e5e5e5';
                            },
                            lineWidth: (context) => {
                                return context.tick.value === 0 ? 2 : 1; // Thicker line for zero
                            },
                        },
                    },
                    x: { 
                                            
                        title: {
                            display: true,
                            text: 'Frequency (Hz)',
                        },
                    },
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    severityShading: true
                }
            },
        });

        console.log('Chart initialized successfully.');
    }
}
