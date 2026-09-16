import raw from '../../../content/first-day/system/training.json' with { type: 'json' };
import type { TrainingCatalog } from './types';

export const INITIAL_TRAINING_CATALOG = raw as TrainingCatalog;
