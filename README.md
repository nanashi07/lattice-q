# Lattice-Q Survey Data Visualization Tool

Lattice-Q is a web application for displaying and analyzing employee survey data, presenting multi-dimensional scoring data categorized by management level and team.

## Features

- **Multi-dimensional Data Display**: Present survey question response data in tabular form categorized by Manager and Team
- **Interactive Filtering**: Users can filter data based on managers and teams
- **File Upload**: Users can upload their own JSON data files for visualization
- **Responsive Design**: Adapts to different screen sizes
- **Data Export**: Support for copying table data in Markdown format
- **Visual Scoring**: Different colors represent various ratings (Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree)

## How to Use

1. Open the `index.html` file to launch the application
2. Click "Choose File" to select a JSON data file from your computer
3. Click "Process Uploaded File" to load and visualize the data
4. Use the filters at the top of the page to select specific managers or teams
5. Click "Apply Filters" to apply the filtering conditions
6. Click "Reset Filters" to reset all filtering conditions
7. Click "Copy as Markdown" to copy the current table data to the clipboard in Markdown format

## Project Structure

```
lattice-q/
├── index.html          # Main page
├── src/                # Source code directory
│   ├── main.js         # Core functionality and API interaction
│   └── table.js        # Table rendering and data processing logic
├── api-sample/         # API sample files
│   └── ...             # GraphQL queries and response examples
└── temp/               # Sample data files (for reference only)
    └── 20250612.json   # Sample survey data structure
```

## Technical Implementation

- Pure vanilla JavaScript implementation, no external dependencies
- ES6 module system for code organization
- Client-side file processing using the FileReader API
- Data interaction with Lattice service via GraphQL API (for data collection)
- Responsive CSS design

## Data Format

Survey data should be in JSON format, with a structure including:
- Question ID and label
- Response data categorized by manager
- Response data categorized by department
- Response data categorized by team

Each category's data includes total responses and counts for each rating level (Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree).

## Expected JSON Structure

The uploaded JSON file should follow this structure:

```json
{
  "questionId": {
    "label": "Question text",
    "managers": [
      {
        "name": "Manager Name",
        "entityId": "manager-id",
        "scores": {
          "totalResponse": 10,
          "stronglyDisagree": 2,
          "disagree": 1,
          "neutral": 3,
          "agree": 2,
          "stronglyAgree": 2
        }
      }
    ],
    "departments": [...],
    "teams": [...]
  }
}
```

See the sample files in the `temp` folder for reference.

## Development

To modify or extend this application:

1. Edit `src/table.js` to change table rendering and data processing logic
2. Modify `src/main.js` to adjust API interaction functionality
3. GraphQL queries can be adjusted to retrieve different data

## License

© 2025 - For internal use only
