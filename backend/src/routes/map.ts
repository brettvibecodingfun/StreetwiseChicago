import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const SODA_URL = 'https://data.cityofchicago.org/resource/4ijn-s7e5.json';

router.get('/inspections', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, results, risk, zip, facilityType, name, license } = req.query as Record<string, string>;

    const conditions: string[] = ['latitude IS NOT NULL', 'longitude IS NOT NULL'];

    if (startDate) conditions.push(`inspection_date >= '${startDate}'`);
    if (endDate)   conditions.push(`inspection_date <= '${endDate}'`);

    if (results?.trim()) {
      conditions.push(`results='${results.trim()}'`);
    }

    if (risk?.trim()) {
      const levels = risk.split(',').map(r => r.trim()).filter(Boolean);
      if (levels.length === 1) {
        conditions.push(`risk='${levels[0]}'`);
      } else if (levels.length > 1) {
        conditions.push(`(${levels.map(r => `risk='${r}'`).join(' OR ')})`);
      }
    }

    if (zip?.trim()) {
      const zips = zip.split(',').map(z => z.trim()).filter(Boolean);
      if (zips.length === 1) {
        conditions.push(`zip='${zips[0]}'`);
      } else if (zips.length > 1) {
        conditions.push(`(${zips.map(z => `zip='${z}'`).join(' OR ')})`);
      }
    }
    if (facilityType?.trim()) conditions.push(`facility_type='${facilityType.trim()}'`);
    if (name?.trim()) {
      const safeName = name.trim().replace(/'/g, "''").toUpperCase();
      conditions.push(`upper(dba_name) LIKE '%${safeName}%'`);
    }

    // license lookup: fetch full history for a single establishment
    if (license?.trim()) {
      const safeLicense = license.trim().replace(/'/g, "''");
      conditions.push(`license_='${safeLicense}'`);
    }

    const params: Record<string, string | number> = {
      $limit: license?.trim() ? 1000 : 500,
      $order: 'inspection_date DESC',
      $select: 'inspection_id,dba_name,license_,address,inspection_date,inspection_type,results,risk,violations,latitude,longitude',
      $where: conditions.join(' AND '),
    };

    const headers: Record<string, string> = {};
    if (process.env.CHICAGO_DATA_APP_TOKEN) {
      headers['Authorization'] = process.env.CHICAGO_DATA_APP_TOKEN;
    }

    const response = await axios.get(SODA_URL, { params, headers });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching map inspections:', error);
    res.status(500).json({ error: 'Failed to fetch inspection data' });
  }
});

export default router;
