window.initializeTasteChart = function () {
  const canvas = document.getElementById('genreChart');
  if (canvas) {
    const ctx = canvas.getContext('2d');

    // Using Unicode for Font Awesome icons
    // Ghost (\uf6e2), Bolt (\uf0e7), Brain (\uf5dc), Heart-Pulse (\uf21e), Users (\uf0c0), Smile (\uf118)
    const iconLabels = ['\uf6e2', '\uf0e7', '\uf5dc', '\uf21e', '\uf0c0', '\uf118'];

    // Destroy existing chart instance if it exists to prevent overlap
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: iconLabels,
        datasets: [{
          label: 'Taste Distribution',
          data: [90, 55, 95, 85, 40, 30],
          backgroundColor: 'rgba(61, 180, 242, 0.2)',
          borderColor: '#3db4f2',
          borderWidth: 2,
          pointBackgroundColor: '#3db4f2',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#3db4f2'
        }]
      },
      options: {
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            beginAtZero: true,
            angleLines: {
              color: '#2b2d42'
            },
            grid: {
              color: '#2b2d42'
            },
            pointLabels: {
              color: '#9fadbd',
              font: {
                size: 16,
                family: '"Font Awesome 6 Free"',
                weight: '900'
              },
              padding: 10
            },
            ticks: {
              display: false,
              stepSize: 20
            }
          }
        },
        maintainAspectRatio: false,
        responsive: true
      }
    });
  }

  const heatmapEl = document.getElementById('heatmap');
  if (heatmapEl) {
    heatmapEl.innerHTML = '';
    // Create 52 columns for a full year view
    for (let i = 0; i < 52; i++) {
      const column = document.createElement('div');
      column.className = 'flex flex-col gap-[3px]';
      for (let j = 0; j < 7; j++) {
        const cell = document.createElement('div');
        const level = Math.floor(Math.random() * 5);
        // Ensure these classes are defined in global.css or via Tailwind
        cell.className = `w-[11px] h-[11px] rounded-[2px] heatmap-cell level-${level}`;
        column.appendChild(cell);
      }
      heatmapEl.appendChild(column);
    }
  }
};

// Also run on DOMContentLoaded for direct page loads/testing
document.addEventListener('DOMContentLoaded', window.initializeTasteChart);
