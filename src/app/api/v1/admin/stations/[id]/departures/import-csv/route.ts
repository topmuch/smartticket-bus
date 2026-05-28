import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getStationById, createDeparturesBatch } from '@/lib/station-db';
import type { RouteContext } from '@/lib/middleware';

// CSV column mapping
// LineNumber,LineName,Color,DayOfWeek,ScheduledTime,Platform,Type,Destination

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export const POST = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params; // station ID

    // Verify station exists
    const station = getStationById(id);
    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Gare non trouvée' },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Le fichier doit être un CSV' },
        { status: 400 }
      );
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString('utf-8');

    // Parse CSV
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Le fichier CSV est vide ou ne contient pas d\'en-tête' },
        { status: 400 }
      );
    }

    // Parse header
    const header = parseCsvLine(lines[0]);
    const colIndex: Record<string, number> = {};
    const headerMap: Record<string, string[]> = {
      lineNumber: ['LineNumber', 'line_number', 'LineNumber'],
      lineName: ['LineName', 'line_name', 'LineName'],
      color: ['Color', 'color'],
      dayOfWeek: ['DayOfWeek', 'day_of_week', 'DayOfWeek'],
      scheduledTime: ['ScheduledTime', 'scheduled_time', 'ScheduledTime', 'Time', 'time', 'Heure'],
      platform: ['Platform', 'platform', 'Quai'],
      type: ['Type', 'type', 'ScheduleType'],
      destination: ['Destination', 'destination'],
    };

    for (const [key, aliases] of Object.entries(headerMap)) {
      const idx = header.findIndex((h) => aliases.includes(h));
      if (idx !== -1) colIndex[key] = idx;
    }

    // Validate required columns
    if (colIndex.dayOfWeek === undefined || colIndex.scheduledTime === undefined || colIndex.destination === undefined) {
      return NextResponse.json(
        { success: false, error: 'Colonnes requises manquantes: DayOfWeek, ScheduledTime, Destination' },
        { status: 400 }
      );
    }

    // Parse data rows
    const departures: Array<{
      stationId: string;
      lineId: string;
      scheduledTime: string;
      platform: number;
      scheduleType: string;
      dayOfWeek: number;
      destination: string;
      delayMinutes: number;
      status: string;
    }> = [];

    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      try {
        const dayOfWeek = parseInt(cols[colIndex.dayOfWeek], 10);
        if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
          errors.push(`Ligne ${i + 1}: jour de la semaine invalide`);
          continue;
        }

        const scheduledTime = cols[colIndex.scheduledTime] || '';
        // Validate time format HH:MM
        if (!/^\d{1,2}:\d{2}$/.test(scheduledTime)) {
          errors.push(`Ligne ${i + 1}: format d'heure invalide (attendu HH:MM)`);
          continue;
        }

        const platform = colIndex.platform !== undefined ? parseInt(cols[colIndex.platform], 10) || 0 : 0;
        const rawType = colIndex.type !== undefined ? cols[colIndex.type] : 'Départ';
        const scheduleType = rawType.toLowerCase().includes('arriv') ? 'arrival' : 'departure';

        // Build line info — use lineId as a generated string based on line number + name
        let lineId = '';
        if (colIndex.lineNumber !== undefined) {
          const lineNum = cols[colIndex.lineNumber] || '';
          const lineName = colIndex.lineName !== undefined ? cols[colIndex.lineName] : '';
          lineId = `line-${lineNum}-${lineName}`.replace(/\s+/g, '-').toLowerCase();
        }

        const destination = cols[colIndex.destination] || '';
        if (!destination) {
          errors.push(`Ligne ${i + 1}: destination manquante`);
          continue;
        }

        departures.push({
          stationId: id,
          lineId,
          scheduledTime,
          platform,
          scheduleType,
          dayOfWeek,
          destination,
          delayMinutes: 0,
          status: 'on_time',
        });
        created++;
      } catch (err) {
        errors.push(`Ligne ${i + 1}: erreur de parsing`);
      }
    }

    // Batch create departures
    if (departures.length > 0) {
      createDeparturesBatch(departures);
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
        updated,
        total: lines.length - 1,
        errors,
      },
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'import CSV' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
