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
 * Extract entities by dimension type from formatted data
 * @param {Array} formattedData - Formatted table data
 * @param {string} dimensionType - Dimension type to extract (Manager, Department, Team)
 * @returns {Array} Array of unique entity names
 */
function extractEntitiesByDimension(formattedData, dimensionType) {
  const entitiesSet = new Set();

  formattedData.forEach(row => {
    if (row.dimension === dimensionType) {
      entitiesSet.add(row.name);
    }
  });

  return Array.from(entitiesSet).sort();
}

/**
 * Populate dropdown with options
 * @param {string} elementId - Select element ID
 * @param {Array} options - Array of option values
 */
function populateDropdown(elementId, options) {
  const selectElement = document.getElementById(elementId);
  if (!selectElement) return;

  selectElement.innerHTML = ''; // Clear existing options

  // Add "Select All" option
  const allOption = document.createElement('option');
  allOption.value = "__all__";
  allOption.textContent = "-- Select All --";
  selectElement.appendChild(allOption);

  // Add individual options
  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.textContent = option;
    optionElement.selected = true; // Select all by default
    selectElement.appendChild(optionElement);
  });
}

/**
 * Get selected values from a multi-select dropdown
 * @param {string} elementId - Select element ID
 * @returns {Array} Array of selected values
 */
function getSelectedOptions(elementId) {
  const selectElement = document.getElementById(elementId);
  if (!selectElement) return [];

  // Check if "Select All" is selected
  const allOption = Array.from(selectElement.options).find(option => option.value === "__all__");
  if (allOption && allOption.selected) {
    // Return all options except the "Select All" one
    return Array.from(selectElement.options)
      .filter(option => option.value !== "__all__")
      .map(option => option.value);
  }

  // Return only selected options
  return Array.from(selectElement.selectedOptions)
    .filter(option => option.value !== "__all__")
    .map(option => option.value);
}

/**
 * Set up "Select All" option behavior
 * @param {string} elementId - Select element ID
 */
function setupSelectAllBehavior(elementId) {
  const selectElement = document.getElementById(elementId);
  if (!selectElement) return;

  selectElement.addEventListener('change', (event) => {
    // Find the "Select All" option
    const allOption = Array.from(selectElement.options).find(option => option.value === "__all__");
    if (!allOption) return;

    if (event.target === allOption || allOption.selected) {
      // If "Select All" was clicked, toggle all other options
      const selectAll = allOption.selected;

      // Skip the first option (which is the "Select All" option)
      for (let i = 1; i < selectElement.options.length; i++) {
        selectElement.options[i].selected = selectAll;
      }
    }
  });
}

/**
 * Apply filters to the data
 * @param {Array} formattedData - Original formatted data
 * @param {Object} filters - Filter criteria
 * @returns {Object} Filtered question groups
 */
function applyFilters(formattedData, filters) {
  const { managers, teams } = filters;

  // Filter the data based on selected managers and teams
  const filteredData = formattedData.filter(row => {
    // Check if this row should be included based on its dimension and name
    if (row.dimension === 'Manager' && !managers.includes(row.name)) {
      return false;
    }

    if (row.dimension === 'Team' && !teams.includes(row.name)) {
      return false;
    }

    return true;
  });

  // Group the filtered data by question
  const questionGroups = {};
  filteredData.forEach(row => {
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

  return questionGroups;
}

/**
 * Setup filter dropdowns and listeners
 * @param {Array} formattedData - Formatted table data
 * @param {HTMLElement} container - Table container element
 * @param {Object} options - Filter options with element IDs
 */
function setupFilters(formattedData, container, options) {
  const { filterElementIds, applyFilterId, resetFilterId } = options;

  // Extract entities for each dimension
  const managers = extractEntitiesByDimension(formattedData, 'Manager');
  const teams = extractEntitiesByDimension(formattedData, 'Team');

  // Populate dropdowns
  populateDropdown(filterElementIds.manager, managers);
  populateDropdown(filterElementIds.team, teams);

  // Setup "Select All" behavior for each dropdown
  setupSelectAllBehavior(filterElementIds.manager);
  setupSelectAllBehavior(filterElementIds.team);

  // Apply filters button
  const applyButton = document.getElementById(applyFilterId);
  if (applyButton) {
    applyButton.addEventListener('click', () => {
      // Get selected filters
      const selectedManagers = getSelectedOptions(filterElementIds.manager);
      const selectedTeams = getSelectedOptions(filterElementIds.team);

      // Apply filters
      const filters = {
        managers: selectedManagers,
        teams: selectedTeams
      };

      const filteredQuestionGroups = applyFilters(formattedData, filters);

      // Render filtered data
      renderFilteredTable(filteredQuestionGroups, container, [
        'stronglyDisagree', 'disagree', 'neutral', 'agree', 'stronglyAgree'
      ]);
    });
  }

  // Reset filters button
  const resetButton = document.getElementById(resetFilterId);
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      // Reset manager dropdown
      populateDropdown(filterElementIds.manager, managers);

      // Reset team dropdown
      populateDropdown(filterElementIds.team, teams);

      // Apply reset (show all data)
      const filters = {
        managers: managers,
        teams: teams
      };

      const filteredQuestionGroups = applyFilters(formattedData, filters);

      renderFilteredTable(filteredQuestionGroups, container, [
        'stronglyDisagree', 'disagree', 'neutral', 'agree', 'stronglyAgree'
      ]);
    });
  }
}

/**
 * Render filtered table
 * @param {Object} questionGroups - Filtered question groups
 * @param {HTMLElement} container - Table container element
 * @param {Array} visibleScoreTypes - Array of score types to display
 */
function renderFilteredTable(questionGroups, container, visibleScoreTypes) {
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
  margin-bottom: 25px;
}

.question-section h3 {
  font-size: 16px;
  margin-bottom: 8px;
}

.question-section h4 {
  font-size: 14px;
  margin: 12px 0 4px;
  color: #555;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
  font-size: 12px;
}

.data-table th, 
.data-table td {
  border: 1px solid #ddd;
  padding: 6px;
  text-align: left;
}

.data-table th {
  background-color: #f2f2f2;
  font-weight: bold;
  font-size: 12px;
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
 * @param {string|null} jsonDataPath - JSON data file path, can be null if data is provided directly
 * @param {string} containerId - DOM ID of the table container
 * @param {Object} options - Options for filtering, can include direct data
 */
function initTable(jsonDataPath, containerId, options = {}) {
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

  // If direct JSON data is provided, use it instead of loading from file
  if (options.data) {
    const formattedData = formatTableData(options.data);

    // Setup copy to markdown functionality
    setupCopyMarkdown(formattedData);

    // Render table
    renderTable(options.data, container, options);
    return;
  }

  // If no data path is provided, show error
  if (!jsonDataPath) {
    console.error('No JSON data path or direct data provided');
    container.innerHTML = '<p>Error: No data source provided</p>';
    return;
  }

  // Load JSON data from file
  fetch(jsonDataPath)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load data from ${jsonDataPath}`);
      }
      return response.json();
    })
    .then(data => {
      const formattedData = formatTableData(data);

      // Setup copy to markdown functionality
      setupCopyMarkdown(formattedData);

      // Render table
      renderTable(data, container, options);
    })
    .catch(error => {
      console.error('Error loading or rendering data:', error);
      container.innerHTML = `<p>Error loading data: ${error.message}</p>`;
    });
}

/**
 * Render the three-dimensional table
 * @param {Object} jsonData - Raw JSON data
 * @param {HTMLElement} container - Table container element
 * @param {Object} options - Options for filtering
 */
function renderTable(jsonData, container, options = {}) {
  const formattedData = formatTableData(jsonData);

  // If filtering is enabled, set up filters
  if (options.enableFiltering && options.filterElementIds) {
    setupFilters(formattedData, container, options);

    // Apply initial filters (show all data)
    const managers = extractEntitiesByDimension(formattedData, 'Manager');
    const teams = extractEntitiesByDimension(formattedData, 'Team');

    const filters = {
      managers: managers,
      teams: teams
    };

    const filteredQuestionGroups = applyFilters(formattedData, filters);

    renderFilteredTable(filteredQuestionGroups, container, [
      'stronglyDisagree', 'disagree', 'neutral', 'agree', 'stronglyAgree'
    ]);
    return;
  }

  // Group data by question (no filtering)
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

  // Render without filtering
  renderFilteredTable(questionGroups, container, [
    'stronglyDisagree', 'disagree', 'neutral', 'agree', 'stronglyAgree'
  ]);
}

/**
 * Convert table content to Markdown format
 * @param {Object} questionGroups - Question groups data
 * @returns {string} - Markdown formatted string
 */
function convertToMarkdown(questionGroups) {
  let markdown = '# Survey Results\n\n';

  Object.keys(questionGroups).forEach((questionId) => {
    const questionData = questionGroups[questionId];
    markdown += `## ${questionData.question}\n\n`;

    Object.keys(questionData.dimensions).forEach((dimension) => {
      const dimensionData = questionData.dimensions[dimension];
      markdown += `### ${dimension}\n\n`;

      // Create table header
      markdown += '| Name | Total Responses | Strongly Disagree | Disagree | Neutral | Agree | Strongly Agree |\n';
      markdown += '|------|----------------|-------------------|----------|---------|-------|---------------|\n';

      // Add data rows
      dimensionData.forEach(row => {
        markdown += `| ${row.name} | ${row.totalResponse} | ${row.stronglyDisagree} | ${row.disagree} | ${row.neutral} | ${row.agree} | ${row.stronglyAgree} |\n`;
      });

      // Add total row
      const totals = calculateTotals(dimensionData);
      markdown += `| **${totals.name}** | **${totals.totalResponse}** | **${totals.stronglyDisagree}** | **${totals.disagree}** | **${totals.neutral}** | **${totals.agree}** | **${totals.stronglyAgree}** |\n\n`;
    });
  });

  return markdown;
}

/**
 * Setup copy to markdown functionality
 * @param {Array} formattedData - Formatted table data
 * @param {HTMLElement} container - Table container element
 */
function setupCopyMarkdown(formattedData) {
  const copyButton = document.getElementById('copy-markdown');
  if (!copyButton) return;

  copyButton.addEventListener('click', () => {
    // Get current visible question groups
    const surveyTableElement = document.getElementById('surveyTable');
    let questionGroups = {};

    // Check if filtering is active
    if (surveyTableElement.querySelectorAll('.question-section').length > 0) {
      // Build question groups from current visible data
      const sections = surveyTableElement.querySelectorAll('.question-section');

      sections.forEach(section => {
        const questionTitle = section.querySelector('h3').textContent;
        const questionId = 'q' + Math.random().toString(36).substring(2, 9); // Generate random ID

        questionGroups[questionId] = {
          question: questionTitle,
          dimensions: {}
        };

        // Process dimensions
        let currentDimension = null;
        let dimensionData = [];

        section.childNodes.forEach(node => {
          // If dimension header found
          if (node.tagName === 'H4') {
            // If we have a previous dimension, add it to the group
            if (currentDimension && dimensionData.length > 0) {
              questionGroups[questionId].dimensions[currentDimension] = [...dimensionData];
              dimensionData = [];
            }

            currentDimension = node.textContent;
            questionGroups[questionId].dimensions[currentDimension] = [];
          }

          // If table found, process rows
          else if (node.tagName === 'TABLE' && currentDimension) {
            const rows = node.querySelectorAll('tbody tr:not(.totals-row)');

            rows.forEach(row => {
              const cells = row.querySelectorAll('td');

              // Create data row
              const dataRow = {
                name: cells[0].textContent,
                totalResponse: parseInt(cells[1].textContent) || 0,
                stronglyDisagree: parseInt(cells[2].textContent) || 0,
                disagree: parseInt(cells[3].textContent) || 0,
                neutral: parseInt(cells[4].textContent) || 0,
                agree: parseInt(cells[5].textContent) || 0,
                stronglyAgree: parseInt(cells[6].textContent) || 0
              };

              dimensionData.push(dataRow);
            });

            // Add last dimension data
            questionGroups[questionId].dimensions[currentDimension] = [...dimensionData];
          }
        });
      });
    } else {
      // If no visible data, use all formatted data
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
    }

    // Convert to markdown
    const markdown = convertToMarkdown(questionGroups);

    // Copy to clipboard
    copyToClipboard(markdown);

    // Show notification
    showCopyNotification();
  });
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
function copyToClipboard(text) {
  // Create temporary textarea
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);

  // Select and copy
  textarea.select();
  document.execCommand('copy');

  // Cleanup
  document.body.removeChild(textarea);
}

/**
 * Show copy notification
 */
function showCopyNotification() {
  const notification = document.getElementById('copy-notification');
  if (!notification) return;

  // Display notification
  notification.style.display = 'block';

  // Hide after animation
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

// Export functions for external use
export { initTable, renderTable, formatTableData, convertToMarkdown };
