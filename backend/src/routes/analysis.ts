import { Router, Request, Response } from 'express';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const SOCRATA_BASE_URL = 'https://data.cityofchicago.org/resource/4ijn-s7e5.json';

router.get('/violations-summary', async (_req: Request, res: Response) => {
  try {
    // 1. Fetch failed inspections since March 1, 2026
    const headers: Record<string, string> = {};
    if (process.env.CHICAGO_DATA_APP_TOKEN) {
      headers['Authorization'] = `${process.env.CHICAGO_DATA_APP_TOKEN}`;
    }

    const socrataResponse = await axios.get(SOCRATA_BASE_URL, {
      params: { $where: "results='Fail' AND inspection_date >= '2026-04-01T00:00:00.000'" },
      headers,
    });

    const inspections: Array<{ dba_name?: string; violations?: string }> = socrataResponse.data;

    if (!inspections.length) {
      res.json({ summary: 'No failed inspections found since March 1st, 2026.' });
      return;
    }

    // 2. Collect all violations text
    const violationsText = inspections
      .filter((r) => r.violations)
      .map((r, i) => `[${i + 1}] ${r.dba_name ?? 'Unknown'}: ${r.violations}`)
      .join('\n\n');

    // 3. Send to Claude for analysis
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `The following are health inspection violations from Chicago restaurants that failed their inspection since March 1st, 2026. There are ${inspections.length} total failed inspections.\n\nPlease analyze these violations and provide:\n1. The most common violation themes/categories\n2. Any patterns you notice\n3. A brief overall summary\n\nKeep the response concise and easy to read.\n\nViolations data:\n\n${violationsText}`,
        },
      ],
    });

    const summary = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as Anthropic.TextBlock).text)
      .join('');

    res.json({ summary, totalInspections: inspections.length });
  } catch (error) {
    console.error('Error generating violations summary:', error);
    res.status(500).json({ error: 'Failed to generate violations summary' });
  }
});

export default router;
