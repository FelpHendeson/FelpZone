import catalog from '../../../content/first-day/world/calendar.json' with { type: 'json' };
import type { CalendarCatalog } from './types';

export const INITIAL_CALENDAR_CATALOG = catalog as CalendarCatalog;
