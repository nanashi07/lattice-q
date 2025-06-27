const graphqlApi = 'https://sportygroup.latticehq.com/graphql';
const headers = {
    'accept': 'application/json',
    'cache-control': 'no-cache',
    'content-type': 'application/json; charset=utf-8',
};
const day = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const initScores = {
    totalResponse: 0,
    stronglyDisagree: 0,
    disagree: 0,
    neutral: 0,
    agree: 0,
    stronglyAgree: 0
};
let state = {
    managers: [],
    teams: [],
    question: {},
};

/**
 * Creates a promise that resolves after a specified time delay
 * @param {number} ms - Time to delay in milliseconds
 * @returns {Promise} Promise that resolves after the specified delay
 */
function delay(ms) {
    // Create a new Promise that will resolve after the specified time
    // This is used throughout the code to prevent API rate limiting
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates the time difference between two dates in milliseconds
 * @param {string} start - Start date string
 * @param {string} end - End date string
 * @returns {number} Time difference in milliseconds
 */
function dateRange(start, end) {
    // Convert both date strings to timestamp values (milliseconds since epoch)
    const from = Date.parse(start);
    const to = Date.parse(end);
    // Return the difference between the timestamps
    return to - from;
}

/**
 * Gets a new date by adding/subtracting an offset from a given date
 * @param {string} day - Base date string
 * @param {number} offset - Offset in milliseconds to add or subtract
 * @returns {string} New date in YYYY-MM-DD format
 */
function anotherDay(day, offset) {
    // Parse the input day string to a timestamp
    const timestamp = Date.parse(day);
    // Create a new Date object by adding the offset to the timestamp
    const date = new Date(timestamp + offset);
    // Convert the date to ISO string and extract only the date part (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
}


/**
 * Retrieves manager information from the GraphQL API and stores it in the state
 * @returns {Promise<void>}
 */
async function retrieveManagers() {
    // Make a POST request to the GraphQL API to get the first batch of managers
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'ManagerFiltersFetchComponentQuery',
            'query': 'query ManagerFiltersFetchComponentQuery(\n  $first: Int\n  $after: String\n  $searchQuery: String\n) {\n  viewer {\n    company {\n      ...ManagerFiltersFetchComponent_company_2Sak8L\n      id\n    }\n    id\n  }\n}\n\nfragment Avatar_user on User {\n  name\n  email\n  title\n  pronouns\n  status\n  avatarUrl\n  avatarFileName\n  avatarCropValues {\n    x\n    y\n    z\n  }\n  colorScheme {\n    userColor\n    id\n  }\n}\n\nfragment ManagerFiltersFetchComponent_company_2Sak8L on Company {\n  managers(first: $first, after: $after, query: $searchQuery) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      node {\n        name\n        title\n        entityId\n        id\n        ...Avatar_user\n        __typename\n      }\n      cursor\n    }\n  }\n  id\n}\n',
            'variables': {
                'first': 20,  // Request 20 managers at a time
                'after': null,  // Start from the beginning (no cursor)
                'searchQuery': ''
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();
    let managers = [];

    // Extract each manager from the response edges
    result.data.viewer.company.managers.edges.forEach(edge => {
        let manager = edge.node;
        managers.push({
            name: manager.name,
            title: manager.title,
            entityId: manager.entityId,
            id: manager.id,
        });
    });

    // Store managers in the application state
    state.managers.push(...managers)

    // Get pagination information for retrieving additional managers if needed
    const hasNextPage = result.data.viewer.company.managers.pageInfo.hasNextPage;
    const after = result.data.viewer.company.managers.pageInfo.endCursor;
    const id = result.data.viewer.company.id

    console.log(`hasNextPage: ${hasNextPage}, after: ${after}, id: ${id}`);

    if (hasNextPage) {
        // If there are more managers, wait a bit to avoid rate limits then fetch the next batch
        await delay(1000);
        await retrieveMoreManagers(after, id);
    } else {
        // All managers have been retrieved, cache them in local storage
        localStorage.setItem('sporty-managers', JSON.stringify(state.managers));
    }
}

/**
 * Fetches additional managers using pagination from the GraphQL API
 * @param {string} theAfter - Pagination cursor
 * @param {string} theId - Company ID
 * @returns {Promise<void>}
 */
async function retrieveMoreManagers(theAfter, theId) {
    // Make a POST request using the pagination cursor to fetch the next batch of managers
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'ManagerFiltersFetchPaginationQuery',
            'query': 'query ManagerFiltersFetchPaginationQuery(\n  $after: String\n  $first: Int = 20\n  $searchQuery: String\n  $id: ID!\n) {\n  node(id: $id) {\n    __typename\n    ...ManagerFiltersFetchComponent_company_2Sak8L\n    id\n  }\n}\n\nfragment Avatar_user on User {\n  name\n  email\n  title\n  pronouns\n  status\n  avatarUrl\n  avatarFileName\n  avatarCropValues {\n    x\n    y\n    z\n  }\n  colorScheme {\n    userColor\n    id\n  }\n}\n\nfragment ManagerFiltersFetchComponent_company_2Sak8L on Company {\n  managers(first: $first, after: $after, query: $searchQuery) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      node {\n        name\n        title\n        entityId\n        id\n        ...Avatar_user\n        __typename\n      }\n      cursor\n    }\n  }\n  id\n}\n',
            'variables': {
                'after': theAfter,  // Pagination cursor to continue where we left off
                'first': 20,        // Number of records to retrieve
                'searchQuery': '',
                'id': theId         // Company ID to retrieve managers from
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();
    let managers = [];

    // Process each manager from the response edges
    result.data.node.managers.edges.forEach(edge => {
        let manager = edge.node;

        // Skip managers that already exist in the state to avoid duplicates
        if (state.managers.find(m => m.entityId === manager.entityId)) {
            console.log(`Manager ${manager.name} already exists, skipping...`);
            return;
        }

        // Add unique managers to the collection
        managers.push({
            name: manager.name,
            title: manager.title,
            entityId: manager.entityId,
            id: manager.id,
        });
    });

    // Add new managers to the state
    state.managers.push(...managers)

    // Get pagination information for the next batch
    const hasNextPage = result.data.node.managers.pageInfo.hasNextPage;
    const after = result.data.node.managers.pageInfo.endCursor;
    const id = result.data.node.id

    console.log(`hasNextPage: ${hasNextPage}, after: ${after}, id: ${id}`);

    if (hasNextPage) {
        // If there are more managers to fetch, wait a bit then make another call
        await delay(1000);
        await retrieveMoreManagers(after, id);
    } else {
        // All managers have been retrieved, cache them in local storage
        localStorage.setItem('sporty-managers', JSON.stringify(state.managers));
    }
}

/**
 * Retrieves team information from the GraphQL API and stores it in the state
 * @returns {Promise<void>}
 */
async function retrieveTeams() {
    // Make a POST request to the GraphQL API to get teams data
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'CustomFieldFiltersV2Query',
            'query': 'query CustomFieldFiltersV2Query(\n  $fieldEntityIds: [EntityId]\n  $active: Boolean\n  $restrictToAllEmployeesView: Boolean\n  $selectOptionsActive: String = \"active_only\"\n) {\n  viewer {\n    company {\n      hasPurchasedHRIS\n      filterableEmployeeFields(sourceType: custom, fieldEntityIds: $fieldEntityIds, active: $active, restrictToAllEmployeesView: $restrictToAllEmployeesView) {\n        __typename\n        ... on BooleanField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on DateField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on EmailField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on MultiSelectField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n          selectOptions(active: $selectOptionsActive) {\n            name\n            entityId\n            defaultKey\n            id\n          }\n        }\n        ... on MultipleChoiceField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n          selectOptions(active: $selectOptionsActive) {\n            name\n            entityId\n            defaultKey\n            id\n          }\n        }\n        ... on NumberField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n          ranges {\n            entityId\n            minValue\n            maxValue\n            id\n          }\n        }\n        ... on PercentageField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on ShortTextField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on SensitiveShortTextField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on LongTextField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on RelationshipField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on Node {\n          __isNode: __typename\n          id\n        }\n      }\n      id\n    }\n    id\n  }\n}\n',
            'variables': {
                'fieldEntityIds': [],
                'active': true,
                'restrictToAllEmployeesView': null,
                'selectOptionsActive': 'active_only'
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();

    // Iterate through the employee fields to find the Team field
    result.data.viewer.company.filterableEmployeeFields.forEach(field => {
        if (field.name === 'Team') {
            let teams = [];

            // Extract each team from the options
            field.selectOptions.forEach(option => {
                teams.push({
                    name: option.name,
                    entityId: option.entityId,
                    id: option.id,
                });
            });

            // Store teams in the application state
            state.teams.push(...teams);

            // Store the team field's entityId to use in filtering operations
            state.customTeamId = field.entityId;

            // Cache teams and team ID in local storage for future use
            localStorage.setItem('sporty-teams', JSON.stringify(state.teams));
            localStorage.setItem('sporty-team-id', state.customTeamId);
        }
    })
}

/**
 * Retrieves survey questions from the GraphQL API
 * @param {Object} query - Query parameters including start and end dates
 * @returns {Promise<Array<string>>} Array of question entity IDs
 */
async function retrieveQuestions(query) {
    // Make a POST request to retrieve the pulse survey questions
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'PulseResultsTableQuery',
            'query': 'query PulseResultsTableQuery(\n  $dateRange: DateRange\n  $previousDateRange: DateRange\n  $defaultGroupByProp: String!\n  $ages: [YearRangeFilterInput!]\n  $tenures: [YearRangeFilterInput!]\n  $genders: [Gender!]\n  $managerEntityIds: [EntityId!]\n  $departmentEntityIds: [EntityId!]\n  $customFields: [PulseAnalyticsCustomFieldFilterInput!]\n  $ratingQuestionsByReviewCycle: [RatingQuestionByReviewCycleFilterInput!]\n  $themeEntityId: EntityId\n  $questionEntityId: EntityId\n  $first: Int\n  $after: String\n  $last: Int\n  $before: String\n  $orderBy: PulseAnalyticsResultsTableOrderBy\n  $orderDirection: OrderDirection\n  $pulseSharingEntityId: EntityId\n  $isCompareWithPrevious: Boolean!\n) {\n  viewer {\n    company {\n      pulseAnalytics: findPulseAnalytics(pulseSharingEntityId: $pulseSharingEntityId) {\n        __typename\n        resultsTableData(dateRange: $dateRange, previousDateRange: $previousDateRange, defaultGroupByProp: $defaultGroupByProp, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId, orderBy: $orderBy, orderDirection: $orderDirection, first: $first, last: $last, after: $after, before: $before) {\n          pageInfo {\n            startCursor\n            endCursor\n          }\n          total\n          edges {\n            cursor\n            node {\n              id\n              entityId\n              label\n              submittedCount\n              employeeCount\n              score\n              trendData\n              scoreDelta @include(if: $isCompareWithPrevious) {\n                value\n                magnitude\n                percent\n              }\n              questionState\n            }\n          }\n        }\n      }\n      id\n    }\n    id\n  }\n}\n',
            'variables': {
                'dateRange': {
                    'start': query.start,
                    'end': query.end
                },
                // Calculate the previous date range with the same duration for comparison
                'previousDateRange': {
                    'start': anotherDay(query.start, -1 * dateRange(query.start, query.end) - day),
                    'end': anotherDay(query.end, -1 * dateRange(query.start, query.end) - day)
                },
                'defaultGroupByProp': 'question', // Group data by questions
                'ages': [],
                'tenures': [],
                'genders': [],
                'managerEntityIds': [],
                'departmentEntityIds': [],
                'customFields': [],
                'ratingQuestionsByReviewCycle': [],
                'themeEntityId': null,
                'questionEntityId': null,
                'first': 20,         // Limit to first 20 results
                'after': null,       // No pagination cursor
                'last': null,
                'before': null,
                'orderBy': 'Label',  // Order by question label
                'orderDirection': 'asc',
                'pulseSharingEntityId': null,
                'isCompareWithPrevious': true  // Include comparison with previous period
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();

    // Process each question from the response
    result.data.viewer.company.pulseAnalytics.resultsTableData.edges
        .filter(edge => !!edge.node.score)  // Only include questions with scores
        .forEach(edge => {
            if (edge.node.entityId in state.question) {
                // Update existing question label
                state.question[edge.node.entityId].label = edge.node.label;
            } else {
                // Initialize a new question in state with empty arrays for dimensions
                state.question[edge.node.entityId] = {
                    label: edge.node.label,
                    managers: [],
                    teams: []
                };
            }
        });

    // Return an array of question entity IDs
    return result.data.viewer.company.pulseAnalytics.resultsTableData.edges
        .filter(edge => !!edge.node.score)
        .map(edge => edge.node.entityId);
}

/**
 * Counts survey responses for a specific question with given filters
 * @param {Object} query - Query parameters
 * @param {Object} previous - Previous state for differential analysis
 * @param {string} type - Analysis type ('managers' or 'teams')
 * @returns {Object} Score counts for the survey responses
 */
async function countSurvey(query, previous, type) {
    // Make GraphQL API call to fetch survey response counts with specified filters
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'PulseResultsCommentsQuery',
            'query': 'query PulseResultsCommentsQuery(\n  $dateRange: DateRange\n  $ages: [YearRangeFilterInput!]\n  $tenures: [YearRangeFilterInput!]\n  $genders: [Gender!]\n  $managerEntityIds: [EntityId!]\n  $departmentEntityIds: [EntityId!]\n  $customFields: [PulseAnalyticsCustomFieldFilterInput!]\n  $ratingQuestionsByReviewCycle: [RatingQuestionByReviewCycleFilterInput!]\n  $themeEntityId: EntityId\n  $questionEntityId: EntityId\n  $pulseSharingEntityId: EntityId\n) {\n  viewer {\n    isImpersonation\n    company {\n      histogramPulseSettings: pulseSettings {\n        ...PulseResultsCommentsHistogram__pulseSettings\n        id\n      }\n      pulseSettings {\n        commentRepliesEnabled\n        id\n      }\n      pulseAnalytics: findPulseAnalytics(pulseSharingEntityId: $pulseSharingEntityId) {\n        __typename\n        submittedResponsesCount(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId)\n        histogramScoreBreakdown: scoreBreakdown(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId) {\n          ...PulseResultsCommentsHistogram___scoreBreakdownType\n        }\n        scoreBreakdown(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId) {\n          ...ResponseOpinionScoreFilterSelector_breakdown\n          hasSufficientResponses\n          stronglyDisagree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          disagree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          neutral {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          agree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          stronglyAgree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n        }\n      }\n      id\n    }\n    id\n  }\n}\n\nfragment PulseResultsCommentsHistogram___scoreBreakdownType on PulseAnalyticsScoreBreakdown {\n  positivePercentage\n  neutralPercentage\n  negativePercentage\n  stronglyDisagree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  disagree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  neutral {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  agree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  stronglyAgree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n}\n\nfragment PulseResultsCommentsHistogram__pulseSettings on PulseSetting {\n  commentRepliesEnabled\n}\n\nfragment ResponseOpinionScoreFilterSelector_breakdown on PulseAnalyticsScoreBreakdown {\n  stronglyDisagree {\n    submittedResponsesPercentage\n  }\n  disagree {\n    submittedResponsesPercentage\n  }\n  neutral {\n    submittedResponsesPercentage\n  }\n  agree {\n    submittedResponsesPercentage\n  }\n  stronglyAgree {\n    submittedResponsesPercentage\n  }\n}\n',
            'variables': {
                'dateRange': {
                    'start': query.start,  // Extract start date from query object
                    'end': query.end  // Extract end date from query object
                },
                'ages': [],
                'tenures': [],
                'genders': [],
                // Map manager objects to their entity IDs for filtering
                'managerEntityIds': query.managers.map(manager => manager.entityId) || [], 
                // Map department objects to their entity IDs for filtering (empty array)
                'departmentEntityIds': [],
                // Map team objects to custom field format for team filtering
                'customFields': query.teams.map(team => {
                    return {
                        'entityId': query.teamId,  // Custom team field entity ID
                        'valueEntityId': team.entityId,  // Specific team value entity ID
                    };
                }) || [],
                'ratingQuestionsByReviewCycle': [],
                'themeEntityId': null,
                'questionEntityId': query.question,  // Specific question to analyze
                'pulseSharingEntityId': null
            }
        }),
        'method': 'POST',
    });

    // Parse the API response as JSON
    const result = await response.json();

    // Extract current survey score counts from the API response
    let scores = {
        totalResponse: result.data.viewer.company.pulseAnalytics.submittedResponsesCount,
        stronglyDisagree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.stronglyDisagree.submittedResponsesCount,
        disagree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.disagree.submittedResponsesCount,
        neutral: result.data.viewer.company.pulseAnalytics.scoreBreakdown.neutral.submittedResponsesCount,
        agree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.agree.submittedResponsesCount,
        stronglyAgree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.stronglyAgree.submittedResponsesCount
    };

    // Calculate the difference between current and previous scores to isolate the impact of the newly added filter
    let scoreDiff = {
        totalResponse: scores.totalResponse - previous.scores.totalResponse,
        stronglyDisagree: scores.stronglyDisagree - previous.scores.stronglyDisagree,
        disagree: scores.disagree - previous.scores.disagree,
        neutral: scores.neutral - previous.scores.neutral,
        agree: scores.agree - previous.scores.agree,
        stronglyAgree: scores.stronglyAgree - previous.scores.stronglyAgree,
    };

    // Process the scores based on the analysis type to identify the newly added entity
    switch (type) {
        case 'managers':
            // Create a copy of current managers array to find the new one
            let managers = query.managers.map(m => m);
            // Remove all managers that existed in the previous state to isolate the new manager
            previous.managers.forEach(previous => {
                managers = managers.filter(current => current.entityId !== previous.entityId);
            });
            // Validate that exactly one new manager was added (differential analysis requirement)
            if (managers.length !== 1) {
                console.warn(`Error: Expected exactly one new manager, found ${JSON.stringify(managers)}`);
                break;
            }
            let manager = managers[0];  // Extract the single new manager
            console.log(`Manager: ${manager.name} - score: ${JSON.stringify(scoreDiff)}`);
            // Only store the manager data if they have survey responses
            if (scoreDiff.totalResponse > 0) {
                // Initialize question structure if it doesn't exist
                if (!(query.question in state.question)) {
                    state.question[query.question] = {
                        managers: []
                    };
                }
                // Initialize managers array if it doesn't exist
                if (!state.question[query.question].managers) {
                    state.question[query.question].managers = [];
                }
                // Add the manager with their score difference to the question data
                state.question[query.question].managers.push({
                    name: manager.name,
                    title: manager.title,
                    entityId: manager.entityId,
                    scores: scoreDiff
                });
            }
            break;
        case 'teams':
            // Create a copy of current teams array to find the new one
            let teams = query.teams.map(t => t);
            // Remove all teams that existed in the previous state to isolate the new team
            previous.teams.forEach(previous => {
                teams = teams.filter(current => current.entityId !== previous.entityId);
            })
            // Validate that exactly one new team was added (differential analysis requirement)
            if (teams.length !== 1) {
                console.warn(`Error: Expected exactly one new team, found ${JSON.stringify(teams)}`);
                break;
            }
            let team = teams[0];  // Extract the single new team
            console.log(`Team: ${team.name} - score: ${JSON.stringify(scoreDiff)}`);
            // Only store the team data if they have survey responses
            if (scoreDiff.totalResponse > 0) {
                // Initialize question structure if it doesn't exist
                if (!(query.question in state.question)) {
                    state.question[query.question] = {
                        teams: []
                    };
                }
                // Initialize teams array if it doesn't exist
                if (!state.question[query.question].teams) {
                    state.question[query.question].teams = [];
                }
                // Add the team with their score difference to the question data
                state.question[query.question].teams.push({
                    name: team.name,
                    entityId: team.entityId,
                    scores: scoreDiff
                });
            }
            break;
        default:
            break;
    }

    // Return the current total scores for use in subsequent iterations
    return scores;
}

/**
 * Calculates the total score by summing all response types
 * @param {Object} scores - Score object with response counts
 * @returns {number} Total sum of all scores
 */
function totalScore(scores) {
    return scores.stronglyDisagree + scores.disagree + scores.neutral + scores.agree + scores.stronglyAgree
}

/**
 * Identifies surveys with incorrect or mismatched data
 * @returns {Object} Filtered question data
 */
async function findMismatchedSurveyCount() {
    // Create a deep copy of the question state to avoid modifying the original data
    let questions = structuredClone(state.question);

    // Iterate through each question in the state
    for (let name in questions) {
        let question = questions[name];

        // Filter managers to find those with mismatched survey counts
        if (question.managers && question.managers.length > 0) {
            // Keep only managers where totalResponse doesn't match the sum of individual response counts
            question.managers = question.managers.filter(manager => manager.scores.totalResponse !== totalScore(manager.scores));
        }

        // Filter teams to find those with mismatched survey counts
        if (question.teams && question.teams.length > 0) {
            // Keep only teams where totalResponse doesn't match the sum of individual response counts
            question.teams = question.teams.filter(team => team.scores.totalResponse !== totalScore(team.scores));
        }
    }

    // Return the filtered questions containing only entities with data inconsistencies
    return questions;
}

/**
 * Selects a subset of analysis data for a specific question and dimension
 * @param {string} questionId - ID of the question
 * @param {string} type - Data dimension type ('managers' or 'teams')
 * @returns {Promise<Array>} Subset of analysis data
 */
async function pickupKnowAnalysis(questionId, type) {
    // Use switch statement to handle different dimension types
    switch (type) {
        case 'managers':
            // Get managers for the specified question from state
            let managers = state.question[questionId].managers
                // Filter to include only managers with consistent survey data (totalResponse matches sum of individual scores)
                .filter(manager => manager.scores.totalResponse === totalScore(manager.scores))
            // Return up to 5 managers (or all if fewer than 5), used as a baseline for analysis
            return managers.slice(0, Math.min(5, managers.length));
        case 'teams':
            // Get teams for the specified question from state
            let teams = state.question[questionId].teams
                // Filter to include only teams with consistent survey data (totalResponse matches sum of individual scores)
                .filter(manager => manager.scores.totalResponse === totalScore(manager.scores))
            // Return up to 5 teams (or all if fewer than 5), used as a baseline for analysis
            return teams.slice(0, Math.min(5, teams.length));
        default:
            // Return empty array for unrecognized dimension types
            return [];
    }
}

/**
 * Recovers survey data by recalculating differences
 * @param {Object} query - Query parameters
 * @param {Object} previous - Previous state for differential analysis
 * @param {string} type - Analysis type ('managers' or 'teams')
 * @returns {Array} Array containing [scores, entity] where entity is the new data point
 */
async function recoverSurvey(query, previous, type) {
    // Make a POST request to get survey data with the specified filters
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'PulseResultsCommentsQuery',
            'query': 'query PulseResultsCommentsQuery(\n  $dateRange: DateRange\n  $ages: [YearRangeFilterInput!]\n  $tenures: [YearRangeFilterInput!]\n  $genders: [Gender!]\n  $managerEntityIds: [EntityId!]\n  $departmentEntityIds: [EntityId!]\n  $customFields: [PulseAnalyticsCustomFieldFilterInput!]\n  $ratingQuestionsByReviewCycle: [RatingQuestionByReviewCycleFilterInput!]\n  $themeEntityId: EntityId\n  $questionEntityId: EntityId\n  $pulseSharingEntityId: EntityId\n) {\n  viewer {\n    isImpersonation\n    company {\n      histogramPulseSettings: pulseSettings {\n        ...PulseResultsCommentsHistogram__pulseSettings\n        id\n      }\n      pulseSettings {\n        commentRepliesEnabled\n        id\n      }\n      pulseAnalytics: findPulseAnalytics(pulseSharingEntityId: $pulseSharingEntityId) {\n        __typename\n        submittedResponsesCount(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId)\n        histogramScoreBreakdown: scoreBreakdown(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId) {\n          ...PulseResultsCommentsHistogram___scoreBreakdownType\n        }\n        scoreBreakdown(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId) {\n          ...ResponseOpinionScoreFilterSelector_breakdown\n          hasSufficientResponses\n          stronglyDisagree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          disagree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          neutral {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          agree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          stronglyAgree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n        }\n      }\n      id\n    }\n    id\n  }\n}\n\nfragment PulseResultsCommentsHistogram___scoreBreakdownType on PulseAnalyticsScoreBreakdown {\n  positivePercentage\n  neutralPercentage\n  negativePercentage\n  stronglyDisagree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  disagree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  neutral {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  agree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  stronglyAgree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n}\n\nfragment PulseResultsCommentsHistogram__pulseSettings on PulseSetting {\n  commentRepliesEnabled\n}\n\nfragment ResponseOpinionScoreFilterSelector_breakdown on PulseAnalyticsScoreBreakdown {\n  stronglyDisagree {\n    submittedResponsesPercentage\n  }\n  disagree {\n    submittedResponsesPercentage\n  }\n  neutral {\n    submittedResponsesPercentage\n  }\n  agree {\n    submittedResponsesPercentage\n  }\n  stronglyAgree {\n    submittedResponsesPercentage\n  }\n}\n',
            'variables': {
                'dateRange': {
                    'start': query.start,
                    'end': query.end
                },
                'ages': [],
                'tenures': [],
                'genders': [],
                // Pass filter parameters based on the query object
                'managerEntityIds': query.managers.map(manager => manager.entityId) || [],
                'departmentEntityIds': [],
                'customFields': query.teams.map(team => {
                    return {
                        'entityId': query.teamId, // The custom team field ID
                        'valueEntityId': team.entityId, // The specific team value
                    };
                }) || [],
                'ratingQuestionsByReviewCycle': [],
                'themeEntityId': null,
                'questionEntityId': query.question, // The specific question being analyzed
                'pulseSharingEntityId': null
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();

    // Extract the current score counts from the response
    let scores = {
        totalResponse: result.data.viewer.company.pulseAnalytics.submittedResponsesCount,
        stronglyDisagree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.stronglyDisagree.submittedResponsesCount,
        disagree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.disagree.submittedResponsesCount,
        neutral: result.data.viewer.company.pulseAnalytics.scoreBreakdown.neutral.submittedResponsesCount,
        agree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.agree.submittedResponsesCount,
        stronglyAgree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.stronglyAgree.submittedResponsesCount
    };

    // Calculate the difference between current scores and previous scores
    // This isolates the impact of the newly added filter element
    let scoreDiff = {
        totalResponse: scores.totalResponse - previous.scores.totalResponse,
        stronglyDisagree: scores.stronglyDisagree - previous.scores.stronglyDisagree,
        disagree: scores.disagree - previous.scores.disagree,
        neutral: scores.neutral - previous.scores.neutral,
        agree: scores.agree - previous.scores.agree,
        stronglyAgree: scores.stronglyAgree - previous.scores.stronglyAgree,
    };

    switch (type) {
        case 'managers':
            // Find which manager is new (present in query.managers but not in previous.managers)
            let managers = query.managers.map(m => m);
            console.debug(`Previous: ${JSON.stringify(previous)}`);
            previous.managers.forEach(previous => {
                managers = managers.filter(current => current.entityId !== previous.entityId);
            });

            // We should find exactly one new manager
            if (managers.length !== 1) {
                console.warn(`Error: Expected exactly one new manager, found ${JSON.stringify(managers)}`);
                break;
            }

            let manager = managers[0]; // Get the newly added manager
            console.log(`Manager: ${manager.name} - score: ${JSON.stringify(scoreDiff)}`);

            // Return both the total scores and the difference attributed to this manager
            return [scores, {
                name: manager.name,
                entityId: manager.entityId,
                scores: scoreDiff
            }];


        case 'teams':
            // Find which team is new (present in query but not in previous)
            let teams = query.teams.map(t => t);
            previous.teams.forEach(previous => {
                teams = teams.filter(current => current.entityId !== previous.entityId);
            })

            if (teams.length !== 1) {
                console.warn(`Error: Expected exactly one new team, found ${JSON.stringify(teams)}`);
                break;
            }

            let team = teams[0]; // Get the newly added team
            console.log(`Team: ${team.name} - score: ${JSON.stringify(scoreDiff)}`);

            // Return both the total scores and the difference attributed to this team
            return [scores, {
                name: team.name,
                entityId: team.entityId,
                scores: scoreDiff
            }];

        default:
            break;
    }

    // If no specific entity was identified or for initialization, just return the total scores
    return [scores, null];
}

/**
 * Creates a base query object from URL parameters
 * @param {string} question - Question entity ID
 * @returns {Object} Query object with start date, end date, and question ID
 */
function createBaseQuery(question) {
    // Extract query parameters from the URL (everything after the ?)
    let query = location.search.substring(1)
        // Split parameters by &
        .split('&')
        // Map each parameter into an object with key-value pairs
        .map(q => {
            p = {};
            // Extract the key (before =) and value (after =)
            p[q.substring(0, q.indexOf('='))] = decodeURIComponent(q.substring(q.indexOf('=') + 1));
            return p;
        })
        // Combine all parameter objects into one
        .reduce((accumulator, currentValue, _currentIndex, _array) => {
            return {...accumulator, ...currentValue}
        }, {});

    // Return a standardized query object with dates formatted as YYYY-MM-DD
    return {
        start: query.start.substring(0, query.start.indexOf('T')), // Extract date part only
        end: query.end.substring(0, query.end.indexOf('T')),       // Extract date part only
        question: question || query.questionEntityId               // Use provided question ID or get from URL
    };
}

/**
 * Refreshes all option data by clearing local storage and retrieving new data
 * @returns {Promise<void>}
 */
async function renewOptions() {
    // Clean up all cached data from local storage
    localStorage.removeItem('sporty-managers');
    localStorage.removeItem('sporty-teams');
    localStorage.removeItem('sporty-team-id');

    // Retrieve fresh data for all dimensions
    await retrieveManagers();
    console.log(`Managers: ${JSON.stringify(state.managers)}`);

    await retrieveTeams();
    console.log(`Teams: ${JSON.stringify(state.teams)}`);
}


/**
 * Analyzes survey data by team dimension
 * @param {string} question - Question entity ID
 * @returns {Promise<void>}
 */
async function analysisTeam(question) {
    // Initialize empty score tracking for incremental analysis
    let previousScores = structuredClone(initScores);

    // Try to load teams from local storage cache, fall back to state if not available
    let teams = localStorage.getItem('sporty-teams');
    if (teams) {
        teams = JSON.parse(teams); // Parse cached JSON data
    } else {
        teams = state.teams; // Use current state as fallback
    }

    // Process teams if available
    if (teams && teams.length > 0) {
        // Iterate through each team to perform incremental analysis
        for (let i = 0; i < teams.length; i++) {
            // Call countSurvey with cumulative teams (0 to i+1) to measure incremental impact
            previousScores = await countSurvey(
                {
                    ...createBaseQuery(question), ...{
                        managers: [], // No manager filter
                        departments: [], // No department filter
                        teams: teams.slice(0, i + 1), // Include all teams up to current index
                        teamId: localStorage.getItem('sporty-team-id') || state.customTeamId // Get team field ID from cache or state
                    }
                },
                {scores: previousScores, teams: teams.slice(0, i)}, // Previous state for differential calculation
                'teams' // Analysis type
            );
            await delay(1000); // Add delay to prevent API rate limiting
        }
    } else {
        console.warn('No team options found for analysis')
    }
}

/**
 * Analyzes survey data by manager dimension
 * @param {string} question - Question entity ID
 * @returns {Promise<void>}
 */
async function analysisManager(question) {
    // Initialize empty score tracking for incremental analysis
    let previousScores = structuredClone(initScores);

    // Try to load managers from local storage cache, fall back to state if not available
    let managers = localStorage.getItem('sporty-managers');
    if (managers) {
        managers = JSON.parse(managers); // Parse cached JSON data
    } else {
        managers = state.managers; // Use current state as fallback
    }

    // Process managers if available
    if (managers && managers.length > 0) {
        // Iterate through each manager to perform incremental analysis
        for (let i = 0; i < managers.length; i++) {
            // Call countSurvey with cumulative managers (0 to i+1) to measure incremental impact
            previousScores = await countSurvey(
                {
                    ...createBaseQuery(question), ...{
                        managers: managers.slice(0, i + 1), // Include all managers up to current index
                        departments: [], // No department filter
                        teams: [], // No team filter
                        teamId: '' // Empty team ID
                    }
                },
                {scores: previousScores, managers: managers.slice(0, i)}, // Previous state for differential calculation
                'managers' // Analysis type
            );
            await delay(1000); // Add delay to prevent API rate limiting
        }
    } else {
        console.warn('No manager options found for analysis')
    }
}

/**
 * Fixes survey scores for incorrect or mismatched surveys
 * @returns {Promise<void>}
 */
async function fixIncorrectSurveyScore() {
    // Get all questions with mismatched survey counts (where totalResponse != sum of individual scores)
    let questions = await findMismatchedSurveyCount();


    // Phase 1: Fix manager scores
    for (let questionId in questions) {
        let question = questions[questionId];

        // Get reliable baseline managers (those with consistent data) to use as a foundation
        let baseManager = await pickupKnowAnalysis(questionId, 'managers');
        if (baseManager.length > 0) {
            // Get baseline scores using only the reliable managers
            let result = await recoverSurvey(
                {
                    ...createBaseQuery(questionId), ...{
                        managers: baseManager,
                        departments: [],
                        teams: [],
                        teamId: ''
                    }
                },
                {scores: structuredClone(initScores), managers: []}, // Start from empty state
                'managers-init'
            );
            let previousScores = result[0]; // Store baseline scores for incremental analysis
            await delay(1000); // Rate limiting delay

            // Process each manager with inconsistent data
            if (question.managers && question.managers.length > 0) {
                for (let manager of question.managers) {
                    // Recalculate scores by adding this manager to the baseline
                    result = await recoverSurvey(
                        {
                            ...createBaseQuery(questionId), ...{
                                managers: [...baseManager, manager], // Add current manager to baseline
                                departments: [],
                                teams: [],
                                teamId: ''
                            }
                        },
                        {scores: previousScores, managers: baseManager}, // Use previous scores for differential calculation
                        'managers'
                    );
                    previousScores = result[0]; // Update running total
                    let entity = result[1]; // Get the corrected score for this manager
                    baseManager = [...baseManager, manager]; // Add to baseline for next iteration

                    // Update the manager's scores in the state with the corrected values
                    state.question[questionId].managers
                        .filter(d => d.entityId === manager.entityId)
                        .forEach(d => {
                            console.log(`Updating question '${question.label}', manager '${d.name}', score: ${JSON.stringify(d.scores)} -> ${JSON.stringify(entity.scores)}`);
                            d.scores = entity.scores // Replace incorrect scores with corrected ones
                        })

                    await delay(1000); // Rate limiting delay
                }
            }
        } else {
            console.warn(`No base manager score for question ${questionId} found, ignore`)
        }
    }

    // Phase 2: Fix team scores
    for (let questionId in questions) {
        let question = questions[questionId];

        // Get reliable baseline teams (those with consistent data) to use as a foundation
        let baseTeam = await pickupKnowAnalysis(questionId, 'teams');
        if (baseTeam.length > 0) {
            // Get baseline scores using only the reliable teams
            let result = await recoverSurvey(
                {
                    ...createBaseQuery(questionId), ...{
                        managers: [],
                        departments: [],
                        teams: baseTeam,
                        teamId: localStorage.getItem('sporty-team-id') || state.customTeamId // Get team field ID from storage or state
                    }
                },
                {scores: structuredClone(initScores), teams: []}, // Start from empty state
                'teams-init'
            );
            let previousScores = result[0]; // Store baseline scores for incremental analysis
            await delay(1000); // Rate limiting delay

            // Process each team with inconsistent data
            if (question.teams && question.teams.length > 0) {
                for (let team of question.teams) {
                    // Recalculate scores by adding this team to the baseline
                    result = await recoverSurvey(
                        {
                            ...createBaseQuery(questionId), ...{
                                managers: [],
                                departments: [],
                                teams: [...baseTeam, team], // Add current team to baseline
                                teamId: localStorage.getItem('sporty-team-id') || state.customTeamId
                            }
                        },
                        {scores: previousScores, teams: baseTeam}, // Use previous scores for differential calculation
                        'teams'
                    );
                    previousScores = result[0]; // Update running total
                    let entity = result[1]; // Get the corrected score for this team
                    baseTeam = [...baseTeam, team]; // Add to baseline for next iteration

                    // Update the team's scores in the state with the corrected values
                    state.question[questionId].teams
                        .filter(d => d.entityId === team.entityId)
                        .forEach(d => {
                            console.log(`Updating question '${question.label}', team '${d.name}', score: ${JSON.stringify(d.scores)} -> ${JSON.stringify(entity.scores)}`);
                            d.scores = entity.scores // Replace incorrect scores with corrected ones
                        })

                    await delay(1000); // Rate limiting delay
                }
            }
        } else {
            console.warn(`No base team score for question ${questionId} found, ignore`)
        }
    }
}

/**
 * Analyzes survey data for all dimensions (manager, team) and fixes any issues with incorrect surveys
 * @returns {Promise<void>}
 */
async function analysis() {
    // Retrieve all available survey questions from the API based on current query parameters
    const questions = await retrieveQuestions(createBaseQuery());

    // Process each question individually to perform comprehensive analysis
    for (let question of questions) {
        console.log(`********** analysis for question: ${state.question[question].label} **********`);
        // Analyze survey responses by manager dimension
        await analysisManager(question);
        // Analyze survey responses by team dimension
        await analysisTeam(question);
    }

    // After collecting all survey data, fix any surveys with inconsistent score calculations
    await fixIncorrectSurveyScore()

    console.log(`********** analysis completed **********`);
    // Output the final analyzed question data containing all dimensions and their scores
    console.log(state.question);
}

/*
await renewOptions();
await analysis();
*/
