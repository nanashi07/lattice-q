# Lattice-Q Survey Data Visualization Tool

Lattice-Q is a web application for displaying and analyzing employee survey data, presenting multi-dimensional scoring data categorized by management level, department, and team.

## Features

- **Multi-dimensional Data Display**: Present survey question response data in tabular form categorized by Manager, Department, and Team
- **Interactive Filtering**: Users can filter data based on managers, departments, and teams
- **Responsive Design**: Adapts to different screen sizes
- **Data Export**: Support for copying table data in Markdown format
- **Visual Scoring**: Different colors represent various ratings (Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree)

## How to Use

1. Open the `index.html` file to launch the application
2. The page will load the default survey data (from `temp/20250612.json`)
3. Use the filters at the top of the page to select specific managers, departments, or teams
4. Click "Apply Filters" to apply the filtering conditions
5. Click "Reset Filters" to reset all filtering conditions
6. Click "Copy as Markdown" to copy the current table data to the clipboard in Markdown format

## Project Structure

```
lattice-q/
├── index.html          # Main page
├── src/                # Source code directory
│   ├── main.js         # Core functionality and API interaction
│   └── table.js        # Table rendering and data processing logic
├── api-sample/         # API sample files
│   └── ...             # GraphQL queries and response examples
└── temp/               # Temporary data files
    └── 20250612.json   # Sample survey data
```

## Technical Implementation

- Pure vanilla JavaScript implementation, no external dependencies
- ES6 module system for code organization
- Data interaction with Lattice service via GraphQL API
- Responsive CSS design

## Data Format

Survey data is stored in JSON format, with a structure including:
- Question ID and label
- Response data categorized by manager
- Response data categorized by department
- Response data categorized by team

Each category's data includes total responses and counts for each rating level (Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree).

## Development

To modify or extend this application:

1. Edit `src/table.js` to change table rendering and data processing logic
2. Modify `src/main.js` to adjust API interaction functionality
3. GraphQL queries can be adjusted to retrieve different data

## License

© 2025 - For internal use only
