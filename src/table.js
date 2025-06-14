// Three-dimensional table component, presenting multi-dimensional scoring data by question

/**
 * Convert JSON data to table-friendly format
 * @param {Object} data - Raw data from JSON file
 * @returns {Array} Formatted data ready for table rendering
 */
function formatTableData(data) {
  const formattedData = [];

  // Iterate through each question
  Object.keys(data).forEach(questionId => {
    const questionData = data[questionId];
    const question = questionData.label;

    // Create a row for each respondent (manager)
    if (questionData.managers && questionData.managers.length > 0) {
      questionData.managers.forEach(manager => {
        // Ensure scores structure is consistent
        const scores = manager.scores.scores || manager.scores;

        // Create a row of data
        const row = {
          questionId,
          question,
          dimension: 'Manager', // First dimension - Manager
          name: manager.name,
          entityId: manager.entityId,
          totalResponse: scores.totalResponse || 0,
          stronglyDisagree: scores.stronglyDisagree || 0,
          disagree: scores.disagree || 0,
          neutral: scores.neutral || 0,
          agree: scores.agree || 0,
          stronglyAgree: scores.stronglyAgree || 0,
        };

        formattedData.push(row);
      });
    }

    // Create a row for each department
    if (questionData.departments && questionData.departments.length > 0) {
      questionData.departments.forEach(department => {
        // Ensure scores structure is consistent
        const scores = department.scores.scores || department.scores;

        // Create a row of data
        const row = {
          questionId,
          question,
          dimension: 'Department', // Second dimension - Department
          name: department.name,
          entityId: department.entityId,
          totalResponse: scores.totalResponse || 0,
          stronglyDisagree: scores.stronglyDisagree || 0,
          disagree: scores.disagree || 0,
          neutral: scores.neutral || 0,
          agree: scores.agree || 0,
          stronglyAgree: scores.stronglyAgree || 0,
        };

        formattedData.push(row);
      });
    }

    // If there is data for a third dimension, also add it (adjust according to actual data structure)
    // Here we assume the third dimension might be teams or other types of groups
    if (questionData.teams && questionData.teams.length > 0) {
      questionData.teams.forEach(team => {
        const scores = team.scores.scores || team.scores;

        const row = {
          questionId,
          question,
          dimension: 'Team', // Third dimension - Team
          name: team.name,
          entityId: team.entityId,
          totalResponse: scores.totalResponse || 0,
          stronglyDisagree: scores.stronglyDisagree || 0,
          disagree: scores.disagree || 0,
          neutral: scores.neutral || 0,
          agree: scores.agree || 0,
          stronglyAgree: scores.stronglyAgree || 0,
        };

        formattedData.push(row);
      });
    }
  });

  return formattedData;
}

/**
 * Calculate the total row for dimension data
 * @param {Array} dimensionData - All row data for the specified dimension
 * @returns {Object} Object containing total values
 */
function calculateTotals(dimensionData) {
  const totals = {
    name: 'Total',
    totalResponse: 0,
    stronglyDisagree: 0,
    disagree: 0,
    neutral: 0,
    agree: 0,
    stronglyAgree: 0
  };

  dimensionData.forEach(row => {
    totals.totalResponse += row.totalResponse;
    totals.stronglyDisagree += row.stronglyDisagree;
    totals.disagree += row.disagree;
    totals.neutral += row.neutral;
    totals.agree += row.agree;
    totals.stronglyAgree += row.stronglyAgree;
  });

  return totals;
}

/**
 * Set cell color based on value
 * @param {HTMLElement} cell - Table cell element
 * @param {string} type - Score type
 * @param {number} value - Score value
 */
function setCellColor(cell, type, value) {
  if (value <= 0) return;

  switch (type) {
    case 'stronglyDisagree':
      cell.style.color = '#ff0000'; // Red
      break;
    case 'disagree':
      cell.style.color = '#ff8c00'; // Orange
      break;
    case 'agree':
      cell.style.color = '#0000ff'; // Blue
      break;
    case 'stronglyAgree':
      cell.style.color = '#008000'; // Green
      break;
    default:
      break;
  }

  // Bold display if value is greater than 0
  if (value > 0) {
    cell.style.fontWeight = 'bold';
  }
}

/**
 * Render the three-dimensional table
 * @param {Object} jsonData - Raw JSON data
 * @param {HTMLElement} container - Table container element
 */
function renderTable(jsonData, container) {
  const formattedData = formatTableData(jsonData);

  // Group data by question
  const questionGroups = {};
  formattedData.forEach(row => {
    if (!questionGroups[row.questionId]) {
      questionGroups[row.questionId] = {
        question: row.question,
        dimensions: {}
      };
    }

    if (!questionGroups[row.questionId].dimensions[row.dimension]) {
      questionGroups[row.questionId].dimensions[row.dimension] = [];
    }

    questionGroups[row.questionId].dimensions[row.dimension].push(row);
  });

  // Clear container
  container.innerHTML = '';

  // Create table elements
  Object.keys(questionGroups).forEach(questionId => {
    const questionData = questionGroups[questionId];

    // Create a table section for each question
    const questionSection = document.createElement('div');
    questionSection.className = 'question-section';

    // Add question title
    const questionTitle = document.createElement('h3');
    questionTitle.textContent = questionData.question;
    questionSection.appendChild(questionTitle);

    // Create table for each dimension
    Object.keys(questionData.dimensions).forEach(dimension => {
      const dimensionData = questionData.dimensions[dimension];

      const dimensionTitle = document.createElement('h4');
      dimensionTitle.textContent = dimension;
      questionSection.appendChild(dimensionTitle);

      // Create table
      const table = document.createElement('table');
      table.className = 'data-table';

      // Table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      ['Name', 'Total Responses', 'Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Table body
      const tbody = document.createElement('tbody');

      // Add data rows
      dimensionData.forEach(row => {
        const tr = document.createElement('tr');

        // Add name cell
        const nameTd = document.createElement('td');
        nameTd.textContent = row.name;
        tr.appendChild(nameTd);

        // Add total response cell
        const totalTd = document.createElement('td');
        totalTd.textContent = row.totalResponse;
        tr.appendChild(totalTd);

        // Add score cells and set color based on conditions
        const scoreTypes = ['stronglyDisagree', 'disagree', 'neutral', 'agree', 'stronglyAgree'];
        scoreTypes.forEach(type => {
          const td = document.createElement('td');
          td.textContent = row[type];
          setCellColor(td, type, row[type]);
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      // Add total row
      const totals = calculateTotals(dimensionData);
      const totalRow = document.createElement('tr');
      totalRow.className = 'totals-row';

      // Add total label cell
      const totalLabelTd = document.createElement('td');
      totalLabelTd.textContent = totals.name;
      totalLabelTd.style.fontWeight = 'bold';
      totalRow.appendChild(totalLabelTd);

      // Add total number cells
      const totalResponseTd = document.createElement('td');
      totalResponseTd.textContent = totals.totalResponse;
      totalResponseTd.style.fontWeight = 'bold';
      totalRow.appendChild(totalResponseTd);

      // Add score totals and set color based on conditions
      const scoreTypes = ['stronglyDisagree', 'disagree', 'neutral', 'agree', 'stronglyAgree'];
      scoreTypes.forEach(type => {
        const td = document.createElement('td');
        td.textContent = totals[type];
        setCellColor(td, type, totals[type]);
        totalRow.appendChild(td);
      });

      tbody.appendChild(totalRow);
      table.appendChild(tbody);

      questionSection.appendChild(table);
    });

    container.appendChild(questionSection);
  });
}

// CSS styles, adjustable as needed
const tableStyles = `
.question-section {
  margin-bottom: 30px;
}

.question-section h3 {
  font-size: 18px;
  margin-bottom: 10px;
}

.question-section h4 {
  font-size: 16px;
  margin: 15px 0 5px;
  color: #555;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}

.data-table th, 
.data-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.data-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.data-table tr:nth-child(even):not(.totals-row) {
  background-color: #f9f9f9;
}

.data-table tr:hover:not(.totals-row) {
  background-color: #e9e9e9;
}

.totals-row {
  background-color: #f0f0f0;
  border-top: 2px solid #ccc;
}
`;

/**
 * Initialize the table
 * @param {string} jsonDataPath - JSON data file path
 * @param {string} containerId - DOM ID of the table container
 */
function initTable(jsonDataPath, containerId) {
  // Add CSS styles
  const styleElement = document.createElement('style');
  styleElement.textContent = tableStyles;
  document.head.appendChild(styleElement);

  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with id "${containerId}" not found.`);
    return;
  }

  // Load JSON data
  fetch(jsonDataPath)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load data from ${jsonDataPath}`);
      }
      return response.json();
    })
    .then(data => {
      renderTable(data, container);
    })
    .catch(error => {
      console.error('Error loading or rendering data:', error);
      container.innerHTML = `<p>Error loading data: ${error.message}</p>`;
    });
}

// Export functions for external use
export { initTable, renderTable, formatTableData };
