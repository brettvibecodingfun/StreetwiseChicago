import { OpenAPIV3 } from 'openapi-types';

const participantSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id:            { type: 'integer', example: 1 },
    name:          { type: 'string',  example: 'Brett' },
    points:        { type: 'integer', example: 42 },
    champion_pick: { type: 'string',  example: 'France' },
    tier1_team:    { type: 'string',  example: 'Argentina' },
    tier2_team_a:  { type: 'string',  example: 'Germany' },
    tier2_team_b:  { type: 'string',  example: 'Morocco' },
    tier3_team_a:  { type: 'string',  example: 'USA' },
    tier3_team_b:  { type: 'string',  example: 'Japan' },
    tier4_team_a:  { type: 'string',  example: 'Canada' },
    tier4_team_b:  { type: 'string',  example: 'Saudi Arabia' },
    tier4_team_c:  { type: 'string',  example: 'Ghana' },
    created_at:    { type: 'string',  format: 'date-time' },
    updated_at:    { type: 'string',  format: 'date-time' },
  },
};

const participantWriteSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['name'],
  properties: {
    name:          { type: 'string',  example: 'Brett' },
    points:        { type: 'integer', example: 0, default: 0 },
    champion_pick: { type: 'string',  example: 'France' },
    tier1_team:    { type: 'string',  example: 'Argentina' },
    tier2_team_a:  { type: 'string',  example: 'Germany' },
    tier2_team_b:  { type: 'string',  example: 'Morocco' },
    tier3_team_a:  { type: 'string',  example: 'USA' },
    tier3_team_b:  { type: 'string',  example: 'Japan' },
    tier4_team_a:  { type: 'string',  example: 'Canada' },
    tier4_team_b:  { type: 'string',  example: 'Saudi Arabia' },
    tier4_team_c:  { type: 'string',  example: 'Ghana' },
  },
};

const participantPatchSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  description: 'All fields optional — only included fields are updated.',
  properties: {
    name:          { type: 'string',  example: 'Brett' },
    points:        { type: 'integer', example: 47 },
    champion_pick: { type: 'string',  example: 'France' },
    tier1_team:    { type: 'string',  example: 'Argentina' },
    tier2_team_a:  { type: 'string',  example: 'Germany' },
    tier2_team_b:  { type: 'string',  example: 'Morocco' },
    tier3_team_a:  { type: 'string',  example: 'USA' },
    tier3_team_b:  { type: 'string',  example: 'Japan' },
    tier4_team_a:  { type: 'string',  example: 'Canada' },
    tier4_team_b:  { type: 'string',  example: 'Saudi Arabia' },
    tier4_team_c:  { type: 'string',  example: 'Ghana' },
  },
};

const adminKeyHeader: OpenAPIV3.ParameterObject = {
  name: 'x-admin-key',
  in: 'header',
  required: true,
  schema: { type: 'string' },
  description: 'Value of `WORLDCUP_ADMIN_KEY` from server environment',
};

export const worldcupSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: "Brett's World Cup 2026 Pool — Admin API",
    version: '1.0.0',
    description:
      'Manage pool participants and view live match data.\n\n' +
      '**Public endpoints** (GET) require no authentication.\n\n' +
      '**Admin endpoints** (POST, PATCH, DELETE) require the `x-admin-key` header ' +
      'matching `WORLDCUP_ADMIN_KEY` in the server environment.\n\n' +
      '**ETL** — use `POST /etl/trigger` to manually run the scoring pipeline against football-data.org.',
  },
  servers: [
    { url: '/api/brettsworldcup', description: 'This server' },
  ],
  components: {
    schemas: {
      Participant: participantSchema,
      ParticipantWrite: participantWriteSchema,
      ParticipantPatch: participantPatchSchema,
    },
    responses: {
      NotFound: {
        description: 'Participant not found',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Not found' } } } } },
      },
      Unauthorized: {
        description: 'Missing or invalid x-admin-key',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Unauthorized' } } } } },
      },
      DbNotConfigured: {
        description: 'DATABASE_URL is not set on the server',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Database not configured' } } } } },
      },
    },
  },
  paths: {
    '/participants': {
      get: {
        summary: 'List all participants',
        description: 'Returns all participants ordered by points descending.',
        tags: ['Participants'],
        responses: {
          '200': {
            description: 'Leaderboard',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Participant' } },
              },
            },
          },
          '503': { $ref: '#/components/responses/DbNotConfigured' },
        },
      },
      post: {
        summary: 'Add a participant',
        description: 'Creates a new pool entry. Requires admin key.',
        tags: ['Participants'],
        parameters: [adminKeyHeader],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ParticipantWrite' } },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Participant' } },
            },
          },
          '400': {
            description: 'Missing required field',
            content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'name is required' } } } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': {
            description: 'Name already taken',
            content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Name already exists' } } } } },
          },
          '503': { $ref: '#/components/responses/DbNotConfigured' },
        },
      },
    },

    '/participants/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Participant ID' },
      ],
      get: {
        summary: 'Get a participant',
        tags: ['Participants'],
        responses: {
          '200': {
            description: 'Participant',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Participant' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '503': { $ref: '#/components/responses/DbNotConfigured' },
        },
      },
      patch: {
        summary: 'Update a participant',
        description:
          'Partial update — send only the fields you want to change. ' +
          'Points are the most common update during the tournament.',
        tags: ['Participants'],
        parameters: [adminKeyHeader],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ParticipantPatch' } },
          },
        },
        responses: {
          '200': {
            description: 'Updated participant',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Participant' } } },
          },
          '400': {
            description: 'No valid fields provided',
            content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'No valid fields to update' } } } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '503': { $ref: '#/components/responses/DbNotConfigured' },
        },
      },
      delete: {
        summary: 'Delete a participant',
        description: 'Permanently removes a participant from the pool. Requires admin key.',
        tags: ['Participants'],
        parameters: [adminKeyHeader],
        responses: {
          '200': {
            description: 'Deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    deleted: {
                      type: 'object',
                      properties: {
                        id:   { type: 'integer', example: 3 },
                        name: { type: 'string',  example: 'Brett' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '503': { $ref: '#/components/responses/DbNotConfigured' },
        },
      },
    },

    '/etl/status': {
      get: {
        summary: 'ETL run history',
        description: 'Returns the last 10 ETL runs with match counts and status.',
        tags: ['ETL'],
        responses: {
          '200': {
            description: 'Recent ETL runs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    last_run: {
                      nullable: true,
                      type: 'object',
                      properties: {
                        id:                   { type: 'integer' },
                        run_at:               { type: 'string', format: 'date-time' },
                        matches_checked:      { type: 'integer' },
                        matches_scored:       { type: 'integer' },
                        participants_updated: { type: 'integer' },
                        status:               { type: 'string', enum: ['success', 'error'] },
                        error_message:        { type: 'string', nullable: true },
                      },
                    },
                    recent_runs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id:                   { type: 'integer' },
                          run_at:               { type: 'string', format: 'date-time' },
                          matches_checked:      { type: 'integer' },
                          matches_scored:       { type: 'integer' },
                          participants_updated: { type: 'integer' },
                          status:               { type: 'string', enum: ['success', 'error'] },
                          error_message:        { type: 'string', nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '503': { $ref: '#/components/responses/DbNotConfigured' },
        },
      },
    },

    '/etl/trigger': {
      post: {
        summary: 'Manually trigger the ETL',
        description:
          'Fetches all finished World Cup matches from football-data.org, ' +
          'calculates points for each participant\'s team picks, and updates the DB idempotently. ' +
          'Safe to run multiple times — already-credited matches are skipped. Requires admin key.',
        tags: ['ETL'],
        parameters: [adminKeyHeader],
        responses: {
          '200': {
            description: 'ETL completed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message:              { type: 'string', example: 'ETL completed' },
                    matchesChecked:       { type: 'integer', example: 36 },
                    matchesScored:        { type: 'integer', example: 36 },
                    participantsUpdated:  { type: 'integer', example: 8 },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': {
            description: 'ETL failed (e.g. API key missing or football-data.org error)',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { error: { type: 'string' } } },
              },
            },
          },
        },
      },
    },

    '/matches': {
      get: {
        summary: 'Live match data',
        description:
          'Proxies football-data.org for World Cup 2026 matches. ' +
          'Cached for 60 seconds. Returns `{ matches: [] }` if `FOOTBALL_DATA_API_KEY` is not configured.',
        tags: ['Matches'],
        responses: {
          '200': {
            description: 'Match data from football-data.org',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    matches: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id:       { type: 'integer' },
                          utcDate:  { type: 'string', format: 'date-time' },
                          status:   { type: 'string', example: 'IN_PLAY', enum: ['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED', 'FINISHED', 'CANCELLED', 'POSTPONED'] },
                          stage:    { type: 'string', example: 'GROUP_STAGE' },
                          group:    { type: 'string', example: 'GROUP_A', nullable: true },
                          homeTeam: { type: 'object', properties: { name: { type: 'string' }, crest: { type: 'string' } } },
                          awayTeam: { type: 'object', properties: { name: { type: 'string' }, crest: { type: 'string' } } },
                          score: {
                            type: 'object',
                            properties: {
                              fullTime: { type: 'object', properties: { home: { type: 'integer', nullable: true }, away: { type: 'integer', nullable: true } } },
                              halfTime: { type: 'object', properties: { home: { type: 'integer', nullable: true }, away: { type: 'integer', nullable: true } } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
