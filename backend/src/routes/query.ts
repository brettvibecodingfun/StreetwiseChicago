import { Router, Request, Response } from 'express';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const SOCRATA_BASE_URL = 'https://data.cityofchicago.org/resource/4ijn-s7e5.json';

interface InspectionQuery {
  dateFrom?: string;
  dateTo?: string;
  results?: string;
  facilityType?: string;
  riskLevel?: string;
  zip?: string;
  dbaName?: string;
  limit?: number;
  orderBy?: string;
}

function buildSodaParams(query: InspectionQuery): Record<string, string | number> {
  const conditions: string[] = [];

  if (query.dateFrom) conditions.push(`inspection_date >= '${query.dateFrom}'`);
  if (query.dateTo) conditions.push(`inspection_date <= '${query.dateTo}'`);
  if (query.results) conditions.push(`results='${query.results}'`);
  if (query.facilityType) conditions.push(`facility_type='${query.facilityType}'`);
  if (query.riskLevel) conditions.push(`risk='${query.riskLevel}'`);
  if (query.zip) conditions.push(`zip='${query.zip}'`);
  if (query.dbaName) {
    const safeName = query.dbaName.replace(/'/g, "''");
    conditions.push(`upper(dba_name) like upper('%${safeName}%')`);
  }

  const params: Record<string, string | number> = {};
  if (conditions.length) params['$where'] = conditions.join(' AND ');
  params['$limit'] = query.limit ?? 100;
  if (query.orderBy) params['$order'] = query.orderBy;

  return params;
}

router.post('/', async (req: Request, res: Response) => {
  const { question } = req.body as { question?: string };

  if (!question?.trim()) {
    res.status(400).json({ error: 'question is required' });
    return;
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const today = new Date().toISOString().split('T')[0];

    // Step 1: Parse question → structured query JSON
    const parseResponse = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: `You are a query builder for Chicago food inspection data. Today's date is ${today}. Convert the user's natural language question into a structured query. For relative dates like "last 5 days", calculate the actual ISO datetime. Always include orderBy "inspection_date DESC" unless asked otherwise.`,
      tools: [
        {
          name: 'build_inspection_query',
          description: 'Convert a natural language question about Chicago food inspections into a structured query object.',
          input_schema: {
            type: 'object' as const,
            properties: {
              dateFrom: {
                type: 'string',
                description: 'ISO datetime string for start of date range, e.g. "2026-04-08T00:00:00.000".',
              },
              dateTo: {
                type: 'string',
                description: 'ISO datetime string for end of date range, e.g. "2026-04-13T23:59:59.999".',
              },
              results: {
                type: 'string',
                enum: ['Fail', 'Pass', 'Pass w/ Conditions', 'Out of Business', 'Business Not Located', 'No Entry', 'Not Ready'],
                description: 'Filter by inspection result. Omit if not specified.',
              },
              facilityType: {
                type: 'string',
                description: 'Type of facility, e.g. "Restaurant", "School", "Grocery Store". Omit if not specified.',
              },
              riskLevel: {
                type: 'string',
                enum: ['Risk 1 (High)', 'Risk 2 (Medium)', 'Risk 3 (Low)'],
                description: 'Risk level of the facility. Omit if not specified.',
              },
              zip: {
                type: 'string',
                description: '5-digit Chicago zip code. Omit if not specified.',
              },
              dbaName: {
                type: 'string',
                description: 'Partial or full restaurant/business name to search for. Omit if not specified.',
              },
              limit: {
                type: 'number',
                description: 'Max results to return. Default 100, max 1000.',
              },
              orderBy: {
                type: 'string',
                description: 'Sort field and direction, e.g. "inspection_date DESC".',
              },
            },
            required: ['limit', 'orderBy'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'build_inspection_query' },
      messages: [{ role: 'user', content: question }],
    });

    const toolUseBlock = parseResponse.content.find((b) => b.type === 'tool_use');
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      res.status(500).json({ error: 'Failed to parse question into query' });
      return;
    }

    const query = toolUseBlock.input as InspectionQuery;

    // Step 2: Fetch data from Socrata
    const sodaParams = buildSodaParams(query);
    const headers: Record<string, string> = {};
    if (process.env.CHICAGO_DATA_APP_TOKEN) {
      headers['Authorization'] = `${process.env.CHICAGO_DATA_APP_TOKEN}`;
    }

    const socrataResponse = await axios.get(SOCRATA_BASE_URL, { params: sodaParams, headers });
    const inspections = socrataResponse.data as object[];

    // Step 3: Stream formatted response back via SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send query metadata immediately so the frontend knows we're working
    res.write(`data: ${JSON.stringify({ type: 'meta', count: inspections.length, queryUsed: query })}\n\n`);

    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: 'You are a helpful assistant answering questions about Chicago food inspections. Format responses clearly and concisely. Use bullet points when listing restaurants. Be conversational.',
      messages: [
        {
          role: 'user',
          content: `The user asked: "${question}"\n\nThe query returned ${inspections.length} total results. Here is the data (up to 20 records shown):\n\n${JSON.stringify(inspections.slice(0, 20), null, 2)}\n\nProvide a clear, direct answer. If there are more than 20 results, mention the full count of ${inspections.length}.`,
        },
      ],
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
    });

    await stream.finalMessage();
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error processing query:', error);
    // If headers haven't been sent yet, send a normal error response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process query' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to process query' })}\n\n`);
      res.end();
    }
  }
});

export default router;
