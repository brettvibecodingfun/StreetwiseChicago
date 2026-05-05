import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const CHICAGO_DATA_APP_TOKEN = 'https://data.cityofchicago.org/resource/4ijn-s7e5.json';

router.get('/failed', async (_req: Request, res: Response) => {
  try {
    const headers: Record<string, string> = {};
    if (process.env.CHICAGO_DATA_APP_TOKEN) {
      headers['Authorization'] = `${process.env.CHICAGO_DATA_APP_TOKEN}`;
    }

    const response = await axios.get(CHICAGO_DATA_APP_TOKEN, {
      params: { $where: "results='Fail' AND inspection_date >= '2026-04-10T00:00:00.000'" },
      headers,
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching failed restaurant inspections:', error);
    res.status(500).json({ error: 'Failed to fetch data from Chicago Open Data API' });
  }
});

export default router;
