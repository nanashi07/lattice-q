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
    departments: [],
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
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates the time difference between two dates in milliseconds
 * @param {string} start - Start date string
 * @param {string} end - End date string
 * @returns {number} Time difference in milliseconds
 */
function dateRange(start, end) {
    const from = Date.parse(start);
    const to = Date.parse(end);
    return to - from;
}

/**
 * Gets a new date by adding/subtracting an offset from a given date
 * @param {string} day - Base date string
 * @param {number} offset - Offset in milliseconds to add or subtract
 * @returns {string} New date in YYYY-MM-DD format
 */
function anotherDay(day, offset) {
    const timestamp = Date.parse(day);
    const date = new Date(timestamp + offset);
    return date.toISOString().split('T')[0];
}

/**
 * Retrieves department information from the GraphQL API and stores it in the state
 * @returns {Promise<void>}
 */
async function retrieveDepartments() {
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'DefaultFieldFiltersQuery',
            'query': 'query DefaultFieldFiltersQuery(\n  $defaultFieldNames: [String]\n  $selectOptionsActive: String = \"active_only\"\n) {\n  viewer {\n    company {\n      hasPurchasedHRIS\n      filterableEmployeeFields(defaultFieldNames: $defaultFieldNames) {\n        __typename\n        ... on BooleanField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on DateField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on EmailField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on MultiSelectField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n          selectOptions(active: $selectOptionsActive) {\n            name\n            entityId\n            defaultKey\n            id\n          }\n        }\n        ... on MultipleChoiceField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n          selectOptions(active: $selectOptionsActive) {\n            name\n            entityId\n            defaultKey\n            id\n          }\n        }\n        ... on NumberField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n          ranges {\n            entityId\n            minValue\n            maxValue\n            id\n          }\n        }\n        ... on PercentageField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on RelationshipField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on ShortTextField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on SensitiveShortTextField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on LongTextField {\n          __typename\n          entityId\n          defaultField\n          name\n          category {\n            label\n            id\n          }\n        }\n        ... on Node {\n          __isNode: __typename\n          id\n        }\n      }\n      id\n    }\n    id\n  }\n}\n',
            'variables': {
                'defaultFieldNames': [
                    'birthdate',
                    'gender_identity',
                    'employment.department_id',
                    'employment.manager_id'
                ],
                'selectOptionsActive': 'active_only'
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();
    result.data.viewer.company.filterableEmployeeFields.forEach(field => {
        if (field.defaultField === 'employment.department_id') {
            let departments = []
            field.selectOptions.forEach(option => {
                departments.push({
                    name: option.name,
                    entityId: option.entityId,
                    id: option.id,
                });
            });
            state.departments.push(...departments);
            localStorage.setItem('sporty-departments', JSON.stringify(state.departments));
        }
    });
}

/**
 * Retrieves manager information from the GraphQL API and stores it in the state
 * @returns {Promise<void>}
 */
async function retrieveManagers() {
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'ManagerFiltersFetchComponentQuery',
            'query': 'query ManagerFiltersFetchComponentQuery(\n  $first: Int\n  $after: String\n  $searchQuery: String\n) {\n  viewer {\n    company {\n      ...ManagerFiltersFetchComponent_company_2Sak8L\n      id\n    }\n    id\n  }\n}\n\nfragment Avatar_user on User {\n  name\n  email\n  title\n  pronouns\n  status\n  avatarUrl\n  avatarFileName\n  avatarCropValues {\n    x\n    y\n    z\n  }\n  colorScheme {\n    userColor\n    id\n  }\n}\n\nfragment ManagerFiltersFetchComponent_company_2Sak8L on Company {\n  managers(first: $first, after: $after, query: $searchQuery) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      node {\n        name\n        title\n        entityId\n        id\n        ...Avatar_user\n        __typename\n      }\n      cursor\n    }\n  }\n  id\n}\n',
            'variables': {
                'first': 20,
                'after': null,
                'searchQuery': ''
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();
    let managers = [];
    result.data.viewer.company.managers.edges.forEach(edge => {
        let manager = edge.node;
        managers.push({
            name: manager.name,
            title: manager.title,
            entityId: manager.entityId,
            id: manager.id,
        });
    });
    state.managers.push(...managers)

    const hasNextPage = result.data.viewer.company.managers.pageInfo.hasNextPage;
    const after = result.data.viewer.company.managers.pageInfo.endCursor;
    const id = result.data.viewer.company.id

    console.log(`hasNextPage: ${hasNextPage}, after: ${after}, id: ${id}`);

    if (hasNextPage) {
        await delay(1000); // Delay to avoid hitting rate limits
        await retrieveMoreManagers(after, id);
    } else {
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
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'ManagerFiltersFetchPaginationQuery',
            'query': 'query ManagerFiltersFetchPaginationQuery(\n  $after: String\n  $first: Int = 20\n  $searchQuery: String\n  $id: ID!\n) {\n  node(id: $id) {\n    __typename\n    ...ManagerFiltersFetchComponent_company_2Sak8L\n    id\n  }\n}\n\nfragment Avatar_user on User {\n  name\n  email\n  title\n  pronouns\n  status\n  avatarUrl\n  avatarFileName\n  avatarCropValues {\n    x\n    y\n    z\n  }\n  colorScheme {\n    userColor\n    id\n  }\n}\n\nfragment ManagerFiltersFetchComponent_company_2Sak8L on Company {\n  managers(first: $first, after: $after, query: $searchQuery) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      node {\n        name\n        title\n        entityId\n        id\n        ...Avatar_user\n        __typename\n      }\n      cursor\n    }\n  }\n  id\n}\n',
            'variables': {
                'after': theAfter,
                'first': 20,
                'searchQuery': '',
                'id': theId
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();
    let managers = [];
    result.data.node.managers.edges.forEach(edge => {
        let manager = edge.node;
        if (state.managers.find(m => m.entityId === manager.entityId)) {
            console.log(`Manager ${manager.name} already exists, skipping...`);
            return; // Skip if manager already exists
        }
        managers.push({
            name: manager.name,
            title: manager.title,
            entityId: manager.entityId,
            id: manager.id,
        });
    });
    state.managers.push(...managers)

    const hasNextPage = result.data.node.managers.pageInfo.hasNextPage;
    const after = result.data.node.managers.pageInfo.endCursor;
    const id = result.data.node.id

    console.log(`hasNextPage: ${hasNextPage}, after: ${after}, id: ${id}`);

    if (hasNextPage) {
        await delay(1000); // Delay to avoid hitting rate limits
        await retrieveMoreManagers(after, id);
    } else {
        localStorage.setItem('sporty-managers', JSON.stringify(state.managers));
    }
}

/**
 * Retrieves team information from the GraphQL API and stores it in the state
 * @returns {Promise<void>}
 */
async function retrieveTeams() {
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
    result.data.viewer.company.filterableEmployeeFields.forEach(field => {
        if (field.name === 'Team') {
            let teams = [];
            field.selectOptions.forEach(option => {
                teams.push({
                    name: option.name,
                    entityId: option.entityId,
                    id: option.id,
                });
            });
            state.teams.push(...teams);
            state.customTeamId = field.entityId;
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
                'previousDateRange': {
                    'start': anotherDay(query.start, -1 * dateRange(query.start, query.end) - day),
                    'end': anotherDay(query.end, -1 * dateRange(query.start, query.end) - day)
                },
                'defaultGroupByProp': 'question',
                'ages': [],
                'tenures': [],
                'genders': [],
                'managerEntityIds': [],
                'departmentEntityIds': [],
                'customFields': [],
                'ratingQuestionsByReviewCycle': [],
                'themeEntityId': null,
                'questionEntityId': null,
                'first': 20,
                'after': null,
                'last': null,
                'before': null,
                'orderBy': 'Label',
                'orderDirection': 'asc',
                'pulseSharingEntityId': null,
                'isCompareWithPrevious': true
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();
    result.data.viewer.company.pulseAnalytics.resultsTableData.edges
        .filter(edge => !!edge.node.score)
        .forEach(edge => {
            if (edge.node.entityId in state.question) {
                state.question[edge.node.entityId].label = edge.node.label;
            } else {
                state.question[edge.node.entityId] = {
                    label: edge.node.label,
                    managers: [],
                    departments: [],
                    teams: []
                };
            }
        });

    return result.data.viewer.company.pulseAnalytics.resultsTableData.edges
        .filter(edge => !!edge.node.score)
        .map(edge => edge.node.entityId);
}

/**
 * Counts survey responses for a specific question with given filters
 * @param {Object} query - Query parameters
 * @param {Object} previous - Previous state for differential analysis
 * @param {string} type - Analysis type ('managers', 'departments', or 'teams')
 * @returns {Object} Score counts for the survey responses
 */
async function countSurvey(query, previous, type) {
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'PulseResultsCommentsQuery',
            'query': 'query PulseResultsCommentsQuery(\n  $dateRange: DateRange\n  $ages: [YearRangeFilterInput!]\n  $tenures: [YearRangeFilterInput!]\n  $genders: [Gender!]\n  $managerEntityIds: [EntityId!]\n  $departmentEntityIds: [EntityId!]\n  $customFields: [PulseAnalyticsCustomFieldFilterInput!]\n  $ratingQuestionsByReviewCycle: [RatingQuestionByReviewCycleFilterInput!]\n  $themeEntityId: EntityId\n  $questionEntityId: EntityId\n  $pulseSharingEntityId: EntityId\n) {\n  viewer {\n    isImpersonation\n    company {\n      histogramPulseSettings: pulseSettings {\n        ...PulseResultsCommentsHistogram__pulseSettings\n        id\n      }\n      pulseSettings {\n        commentRepliesEnabled\n        id\n      }\n      pulseAnalytics: findPulseAnalytics(pulseSharingEntityId: $pulseSharingEntityId) {\n        __typename\n        submittedResponsesCount(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId)\n        histogramScoreBreakdown: scoreBreakdown(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId) {\n          ...PulseResultsCommentsHistogram___scoreBreakdownType\n        }\n        scoreBreakdown(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId) {\n          ...ResponseOpinionScoreFilterSelector_breakdown\n          hasSufficientResponses\n          stronglyDisagree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          disagree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          neutral {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          agree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          stronglyAgree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n        }\n      }\n      id\n    }\n    id\n  }\n}\n\nfragment PulseResultsCommentsHistogram___scoreBreakdownType on PulseAnalyticsScoreBreakdown {\n  positivePercentage\n  neutralPercentage\n  negativePercentage\n  stronglyDisagree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  disagree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  neutral {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  agree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  stronglyAgree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n}\n\nfragment PulseResultsCommentsHistogram__pulseSettings on PulseSetting {\n  commentRepliesEnabled\n}\n\nfragment ResponseOpinionScoreFilterSelector_breakdown on PulseAnalyticsScoreBreakdown {\n  stronglyDisagree {\n    submittedResponsesPercentage\n  }\n  disagree {\n    submittedResponsesPercentage\n  }\n  neutral {\n    submittedResponsesPercentage\n  }\n  agree {\n    submittedResponsesPercentage\n  }\n  stronglyAgree {\n    submittedResponsesPercentage\n  }\n}\n',
            'variables': {
                'dateRange': {
                    'start': query.start,  // '2025-06-06',
                    'end': query.end  // '2025-06-12'
                },
                'ages': [],
                'tenures': [],
                'genders': [],
                'managerEntityIds': query.managers.map(manager => manager.entityId) || [], // ['4004d870-889b-11e8-9e91-6beb3fb6f0f7'],
                'departmentEntityIds': query.departments.map(department => department.entityId) || [],
                'customFields': query.teams.map(team => {
                    return {
                        'entityId': query.teamId,  // custom team entity ID
                        'valueEntityId': team.entityId,
                    };
                }) || [],
                'ratingQuestionsByReviewCycle': [],
                'themeEntityId': null,
                'questionEntityId': query.question,  // '4004d870-889b-11e8-9e91-6beb3fb6f0f7',
                'pulseSharingEntityId': null
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();
    let scores = {
        totalResponse: result.data.viewer.company.pulseAnalytics.submittedResponsesCount,
        stronglyDisagree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.stronglyDisagree.submittedResponsesCount,
        disagree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.disagree.submittedResponsesCount,
        neutral: result.data.viewer.company.pulseAnalytics.scoreBreakdown.neutral.submittedResponsesCount,
        agree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.agree.submittedResponsesCount,
        stronglyAgree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.stronglyAgree.submittedResponsesCount
    };

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
            // get the added manager
            let managers = query.managers.map(m => m);
            previous.managers.forEach(previous => {
                managers = managers.filter(current => current.entityId !== previous.entityId);
            });
            if (managers.length !== 1) {
                console.warn(`Error: Expected exactly one new manager, found ${JSON.stringify(managers)}`);
                break;
            }
            let manager = managers[0];  // should be only one
            console.log(`Manager: ${manager.name} - score: ${JSON.stringify(scoreDiff)}`);
            if (scoreDiff.totalResponse > 0) {
                if (!(query.question in state.question)) {
                    state.question[query.question] = {
                        managers: []
                    };
                }
                if (!state.question[query.question].managers) {
                    state.question[query.question].managers = [];
                }
                state.question[query.question].managers.push({
                    name: manager.name,
                    entityId: manager.entityId,
                    scores: scoreDiff
                });
            }
            break;
        case 'departments':
            let departments = query.departments.map(d => d);
            previous.departments.forEach(previous => {
                departments = departments.filter(current => current.entityId !== previous.entityId);
            });
            if (departments.length !== 1) {
                console.warn(`Error: Expected exactly one new department, found ${JSON.stringify(departments)}`);
                break;
            }
            let department = departments[0];  // should be only one
            console.log(`Department: ${department.name} - score: ${JSON.stringify(scoreDiff)}`);
            if (scoreDiff.totalResponse > 0) {
                if (!(query.question in state.question)) {
                    state.question[query.question] = {
                        departments: []
                    };
                }
                if (!state.question[query.question].departments) {
                    state.question[query.question].departments = [];
                }
                state.question[query.question].departments.push({
                    name: department.name,
                    entityId: department.entityId,
                    scores: scoreDiff
                });
            }
            break;
        case 'teams':
            let teams = query.teams.map(t => t);
            previous.teams.forEach(previous => {
                teams = teams.filter(current => current.entityId !== previous.entityId);
            })
            if (teams.length !== 1) {
                console.warn(`Error: Expected exactly one new team, found ${JSON.stringify(teams)}`);
                break;
            }
            let team = teams[0];  // should be only one
            console.log(`Team: ${team.name} - score: ${JSON.stringify(scoreDiff)}`);
            if (scoreDiff.totalResponse > 0) {
                if (!(query.question in state.question)) {
                    state.question[query.question] = {
                        teams: []
                    };
                }
                if (!state.question[query.question].teams) {
                    state.question[query.question].teams = [];
                }
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
    let questions = structuredClone(state.question);
    for (let name in questions) {
        let question = questions[name];
        if (question.departments && question.departments.length > 0) {
            question.departments = question.departments.filter(department => department.scores.totalResponse !== totalScore(department.scores));
        }
        if (question.managers && question.managers.length > 0) {
            question.managers = question.managers.filter(manager => manager.scores.totalResponse !== totalScore(manager.scores));
        }
        if (question.teams && question.teams.length > 0) {
            question.teams = question.teams.filter(team => team.scores.totalResponse !== totalScore(team.scores));
        }
    }
    return questions;
}

/**
 * Selects a subset of analysis data for a specific question and dimension
 * @param {string} questionId - ID of the question
 * @param {string} type - Data dimension type ('managers', 'departments', or 'teams')
 * @returns {Promise<Array>} Subset of analysis data
 */
async function pickupKnowAnalysis(questionId, type) {
    switch (type) {
        case 'managers':
            let managers = state.question[questionId].managers
                .filter(manager => manager.scores.totalResponse === totalScore(manager.scores))
            return managers.slice(0, Math.min(5, managers.length));
        case 'departments':
            let departments = state.question[questionId].departments
                .filter(manager => manager.scores.totalResponse === totalScore(manager.scores))
            return departments.slice(0, Math.min(5, departments.length));
        case 'teams':
            let teams = state.question[questionId].teams
                .filter(manager => manager.scores.totalResponse === totalScore(manager.scores))
            return teams.slice(0, Math.min(5, teams.length));
        default:
            return [];
    }
}

/**
 * Recovers survey data by recalculating differences
 * @param {Object} query - Query parameters
 * @param {Object} previous - Previous state for differential analysis
 * @param {string} type - Analysis type ('managers', 'departments', or 'teams')
 * @returns {Array} Array containing [scores, entity] where entity is the new data point
 */
async function recoverSurvey(query, previous, type) {
    const response = await fetch(graphqlApi, {
        'headers': headers,
        'body': JSON.stringify({
            'id': 'PulseResultsCommentsQuery',
            'query': 'query PulseResultsCommentsQuery(\n  $dateRange: DateRange\n  $ages: [YearRangeFilterInput!]\n  $tenures: [YearRangeFilterInput!]\n  $genders: [Gender!]\n  $managerEntityIds: [EntityId!]\n  $departmentEntityIds: [EntityId!]\n  $customFields: [PulseAnalyticsCustomFieldFilterInput!]\n  $ratingQuestionsByReviewCycle: [RatingQuestionByReviewCycleFilterInput!]\n  $themeEntityId: EntityId\n  $questionEntityId: EntityId\n  $pulseSharingEntityId: EntityId\n) {\n  viewer {\n    isImpersonation\n    company {\n      histogramPulseSettings: pulseSettings {\n        ...PulseResultsCommentsHistogram__pulseSettings\n        id\n      }\n      pulseSettings {\n        commentRepliesEnabled\n        id\n      }\n      pulseAnalytics: findPulseAnalytics(pulseSharingEntityId: $pulseSharingEntityId) {\n        __typename\n        submittedResponsesCount(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId)\n        histogramScoreBreakdown: scoreBreakdown(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId) {\n          ...PulseResultsCommentsHistogram___scoreBreakdownType\n        }\n        scoreBreakdown(dateRange: $dateRange, ages: $ages, tenures: $tenures, genders: $genders, managerEntityIds: $managerEntityIds, departmentEntityIds: $departmentEntityIds, customFields: $customFields, ratingQuestionsByReviewCycle: $ratingQuestionsByReviewCycle, themeEntityId: $themeEntityId, questionEntityId: $questionEntityId) {\n          ...ResponseOpinionScoreFilterSelector_breakdown\n          hasSufficientResponses\n          stronglyDisagree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          disagree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          neutral {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          agree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n          stronglyAgree {\n            commentsCount\n            submittedResponsesCount\n            submittedResponsesPercentage\n          }\n        }\n      }\n      id\n    }\n    id\n  }\n}\n\nfragment PulseResultsCommentsHistogram___scoreBreakdownType on PulseAnalyticsScoreBreakdown {\n  positivePercentage\n  neutralPercentage\n  negativePercentage\n  stronglyDisagree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  disagree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  neutral {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  agree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n  stronglyAgree {\n    submittedResponsesCount\n    commentsCount\n    submittedResponsesPercentage\n  }\n}\n\nfragment PulseResultsCommentsHistogram__pulseSettings on PulseSetting {\n  commentRepliesEnabled\n}\n\nfragment ResponseOpinionScoreFilterSelector_breakdown on PulseAnalyticsScoreBreakdown {\n  stronglyDisagree {\n    submittedResponsesPercentage\n  }\n  disagree {\n    submittedResponsesPercentage\n  }\n  neutral {\n    submittedResponsesPercentage\n  }\n  agree {\n    submittedResponsesPercentage\n  }\n  stronglyAgree {\n    submittedResponsesPercentage\n  }\n}\n',
            'variables': {
                'dateRange': {
                    'start': query.start,  // '2025-06-06',
                    'end': query.end  // '2025-06-12'
                },
                'ages': [],
                'tenures': [],
                'genders': [],
                'managerEntityIds': query.managers.map(manager => manager.entityId) || [], // ['4004d870-889b-11e8-9e91-6beb3fb6f0f7'],
                'departmentEntityIds': query.departments.map(department => department.entityId) || [],
                'customFields': query.teams.map(team => {
                    return {
                        'entityId': query.teamId,  // custom team entity ID
                        'valueEntityId': team.entityId,
                    };
                }) || [],
                'ratingQuestionsByReviewCycle': [],
                'themeEntityId': null,
                'questionEntityId': query.question,  // '4004d870-889b-11e8-9e91-6beb3fb6f0f7',
                'pulseSharingEntityId': null
            }
        }),
        'method': 'POST',
    });

    const result = await response.json();
    let scores = {
        totalResponse: result.data.viewer.company.pulseAnalytics.submittedResponsesCount,
        stronglyDisagree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.stronglyDisagree.submittedResponsesCount,
        disagree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.disagree.submittedResponsesCount,
        neutral: result.data.viewer.company.pulseAnalytics.scoreBreakdown.neutral.submittedResponsesCount,
        agree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.agree.submittedResponsesCount,
        stronglyAgree: result.data.viewer.company.pulseAnalytics.scoreBreakdown.stronglyAgree.submittedResponsesCount
    };

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
            // get the added manager
            let managers = query.managers.map(m => m);
            console.debug(`Previous: ${JSON.stringify(previous)}`);
            previous.managers.forEach(previous => {
                managers = managers.filter(current => current.entityId !== previous.entityId);
            });
            if (managers.length !== 1) {
                console.warn(`Error: Expected exactly one new manager, found ${JSON.stringify(managers)}`);
                break;
            }
            let manager = managers[0];  // should be only one
            console.log(`Manager: ${manager.name} - score: ${JSON.stringify(scoreDiff)}`);
            return [scores, {
                name: manager.name,
                entityId: manager.entityId,
                scores: scoreDiff
            }];
        case 'departments':
            let departments = query.departments.map(d => d);
            previous.departments.forEach(previous => {
                departments = departments.filter(current => current.entityId !== previous.entityId);
            });
            if (departments.length !== 1) {
                console.warn(`Error: Expected exactly one new department, found ${JSON.stringify(departments)}`);
                break;
            }
            let department = departments[0];  // should be only one
            console.log(`Department: ${department.name} - score: ${JSON.stringify(scoreDiff)}`);
            return [scores, {
                name: department.name,
                entityId: department.entityId,
                scores: scoreDiff
            }];
        case 'teams':
            let teams = query.teams.map(t => t);
            previous.teams.forEach(previous => {
                teams = teams.filter(current => current.entityId !== previous.entityId);
            })
            if (teams.length !== 1) {
                console.warn(`Error: Expected exactly one new team, found ${JSON.stringify(teams)}`);
                break;
            }
            let team = teams[0];  // should be only one
            console.log(`Team: ${team.name} - score: ${JSON.stringify(scoreDiff)}`);
            return [scores, {
                name: team.name,
                entityId: team.entityId,
                scores: scoreDiff
            }];
        default:
            break;
    }

    // return the total scores for first check
    return [scores, null];
}

/**
 * Creates a base query object from URL parameters
 * @param {string} question - Question entity ID
 * @returns {Object} Query object with start date, end date, and question ID
 */
function createBaseQuery(question) {
    let query = location.search.substring(1)
        .split('&')
        .map(q => {
            p = {};
            p[q.substring(0, q.indexOf('='))] = decodeURIComponent(q.substring(q.indexOf('=') + 1));
            return p;
        })
        .reduce((accumulator, currentValue, _currentIndex, _array) => {
            return {...accumulator, ...currentValue}
        }, {});

    return {
        start: query.start.substring(0, query.start.indexOf('T')),
        end: query.end.substring(0, query.end.indexOf('T')),
        question: question || query.questionEntityId
    };
}

/**
 * Refreshes all option data by clearing local storage and retrieving new data
 * @returns {Promise<void>}
 */
async function renewOptions() {
    // clean up localstorage
    localStorage.removeItem('sporty-departments');
    localStorage.removeItem('sporty-managers');
    localStorage.removeItem('sporty-teams');
    localStorage.removeItem('sporty-team-id');

    await retrieveManagers();
    console.log(`Managers: ${JSON.stringify(state.managers)}`);

    await retrieveDepartments();
    console.log(`Departments: ${JSON.stringify(state.departments)}`);

    await retrieveTeams();
    console.log(`Teams: ${JSON.stringify(state.teams)}`);
}

/**
 * Analyzes survey data by department dimension
 * @param {string} question - Question entity ID
 * @returns {Promise<void>}
 */
async function analysisDepartment(question) {
    let previousScores = {
        totalResponse: 0,
        stronglyDisagree: 0,
        disagree: 0,
        neutral: 0,
        agree: 0,
        stronglyAgree: 0
    };

    let departments = localStorage.getItem('sporty-departments');
    if (departments) {
        departments = JSON.parse(departments);
    } else {
        departments = state.departments;
    }

    if (departments && departments.length > 0) {
        for (let i = 0; i < departments.length; i++) {
            previousScores = await countSurvey(
                {
                    ...createBaseQuery(question), ...{
                        managers: [],
                        departments: departments.slice(0, i + 1),
                        teams: [],
                        teamId: ''
                    }
                },
                {scores: previousScores, departments: departments.slice(0, i)},
                'departments'
            );
            await delay(1000); // Delay to avoid hitting rate limits
        }
    } else {
        console.warn('No manager options found for analysis')
    }
}

/**
 * Analyzes survey data by team dimension
 * @param {string} question - Question entity ID
 * @returns {Promise<void>}
 */
async function analysisTeam(question) {
    let previousScores = {
        totalResponse: 0,
        stronglyDisagree: 0,
        disagree: 0,
        neutral: 0,
        agree: 0,
        stronglyAgree: 0
    };

    let teams = localStorage.getItem('sporty-teams');
    if (teams) {
        teams = JSON.parse(teams);
    } else {
        teams = state.teams;
    }

    if (teams && teams.length > 0) {
        for (let i = 0; i < teams.length; i++) {
            previousScores = await countSurvey(
                {
                    ...createBaseQuery(question), ...{
                        managers: [],
                        departments: [],
                        teams: teams.slice(0, i + 1),
                        teamId: localStorage.getItem('sporty-team-id') || state.customTeamId
                    }
                },
                {scores: previousScores, teams: teams.slice(0, i)},
                'teams'
            );
            await delay(1000); // Delay to avoid hitting rate limits
        }
    } else {
        console.warn('No manager options found for analysis')
    }
}

/**
 * Analyzes survey data by manager dimension
 * @param {string} question - Question entity ID
 * @returns {Promise<void>}
 */
async function analysisManager(question) {
    let previousScores = {
        totalResponse: 0,
        stronglyDisagree: 0,
        disagree: 0,
        neutral: 0,
        agree: 0,
        stronglyAgree: 0
    };

    let managers = localStorage.getItem('sporty-managers');
    if (managers) {
        managers = JSON.parse(managers);
    } else {
        managers = state.managers;
    }

    if (managers && managers.length > 0) {
        for (let i = 0; i < managers.length; i++) {
            previousScores = await countSurvey(
                {
                    ...createBaseQuery(question), ...{
                        managers: managers.slice(0, i + 1),
                        departments: [],
                        teams: [],
                        teamId: ''
                    }
                },
                {scores: previousScores, managers: managers.slice(0, i)},
                'managers'
            );
            await delay(1000); // Delay to avoid hitting rate limits
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
    let questions = await findMismatchedSurveyCount();

    for (let questionId in questions) {
        let question = questions[questionId];

        let baseDepartment = await pickupKnowAnalysis(questionId, 'departments');
        if (baseDepartment.length > 0) {
            let result = await recoverSurvey(
                {
                    ...createBaseQuery(questionId), ...{
                        managers: [],
                        departments: baseDepartment,
                        teams: [],
                        teamId: ''
                    }
                },
                {scores: structuredClone(initScores), departments: []},
                'departments-init'
            );
            let previousScores = result[0];
            await delay(1000);

            if (question.departments && question.departments.length > 0) {
                for (let department of question.departments) {
                    result = await recoverSurvey(
                        {
                            ...createBaseQuery(questionId), ...{
                                managers: [],
                                departments: [...baseDepartment, department],
                                teams: [],
                                teamId: ''
                            }
                        },
                        {scores: previousScores, departments: baseDepartment},
                        'departments'
                    );
                    previousScores = result[0];
                    let newScore = result[1];
                    baseDepartment = [...baseDepartment, department];
                    // update score
                    state.question[questionId].departments
                        .filter(d => d.entityId === department.entityId)
                        .forEach(d => {
                            console.log(`Updating question '${question.label}', department '${d.name}', score: ${JSON.stringify(d.scores)} -> ${JSON.stringify(newScore)}`);
                            d.scores = newScore
                        })

                    await delay(1000);
                }
            }
        } else {
            console.warn(`No base department score for question ${questionId} found, ignore`)
        }

    }

    for (let questionId in questions) {
        let question = questions[questionId];

        let baseManager = await pickupKnowAnalysis(questionId, 'managers');
        if (baseManager.length > 0) {
            let result = await recoverSurvey(
                {
                    ...createBaseQuery(questionId), ...{
                        managers: baseManager,
                        departments: [],
                        teams: [],
                        teamId: ''
                    }
                },
                {scores: structuredClone(initScores), managers: []},
                'managers-init'
            );
            let previousScores = result[0];
            await delay(1000);

            if (question.managers && question.managers.length > 0) {
                for (let manager of question.managers) {
                    result = await recoverSurvey(
                        {
                            ...createBaseQuery(questionId), ...{
                                managers: [...baseManager, manager],
                                departments: [],
                                teams: [],
                                teamId: ''
                            }
                        },
                        {scores: previousScores, managers: baseManager},
                        'managers'
                    );
                    previousScores = result[0];
                    let newScore = result[1];
                    baseManager = [...baseManager, manager];
                    // update score
                    state.question[questionId].managers
                        .filter(d => d.entityId === manager.entityId)
                        .forEach(d => {
                            console.log(`Updating question '${question.label}', manager '${d.name}', score: ${JSON.stringify(d.scores)} -> ${JSON.stringify(newScore)}`);
                            d.scores = newScore
                        })

                    await delay(1000);
                }
            }
        } else {
            console.warn(`No base manager score for question ${questionId} found, ignore`)
        }

    }

    for (let questionId in questions) {
        let question = questions[questionId];

        let baseTeam = await pickupKnowAnalysis(questionId, 'teams');
        if (baseTeam.length > 0) {
            let result = await recoverSurvey(
                {
                    ...createBaseQuery(questionId), ...{
                        managers: [],
                        departments: [],
                        teams: baseTeam,
                        teamId: localStorage.getItem('sporty-team-id') || state.customTeamId
                    }
                },
                {scores: structuredClone(initScores), teams: []},
                'teams-init'
            );
            let previousScores = result[0];
            await delay(1000);

            if (question.teams && question.teams.length > 0) {
                for (let team of question.teams) {
                    result = await recoverSurvey(
                        {
                            ...createBaseQuery(questionId), ...{
                                managers: [],
                                departments: [],
                                teams: [...baseTeam, team],
                                teamId: localStorage.getItem('sporty-team-id') || state.customTeamId
                            }
                        },
                        {scores: previousScores, teams: baseTeam},
                        'teams'
                    );
                    previousScores = result[0];
                    let newScore = result[1];
                    baseTeam = [...baseTeam, team];
                    // update score
                    state.question[questionId].teams
                        .filter(d => d.entityId === team.entityId)
                        .forEach(d => {
                            console.log(`Updating question '${question.label}', team '${d.name}', score: ${JSON.stringify(d.scores)} -> ${JSON.stringify(newScore)}`);
                            d.scores = newScore
                        })

                    await delay(1000);
                }
            }
        } else {
            console.warn(`No base team score for question ${questionId} found, ignore`)
        }

    }
}

/**
 * Analyzes survey data for all dimensions (department, manager, team) and fixes any issues with incorrect surveys
 * @returns {Promise<void>}
 */
async function analysis() {
    const questions = await retrieveQuestions(createBaseQuery());

    for (let question of questions) {
        console.log(`********** analysis for question: ${state.question[question].label} **********`);
        await analysisDepartment(question);
        await analysisManager(question);
        await analysisTeam(question);
    }

    await fixIncorrectSurveyScore()

    console.log(`********** analysis completed **********`);
    console.log(state.question);
}

/*
await renewOptions();
await analysis();
*/