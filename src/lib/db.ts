import Dexie, { type EntityTable } from 'dexie';
import { PortfolioItem } from './excel-parser';
import { UploadedFile } from './types';

// Define the database
const db = new Dexie('PortfolioDB') as Dexie & {
    items: EntityTable<PortfolioItem & { id?: number }, 'id'>;
    files: EntityTable<UploadedFile, 'id'>;
};

// Schema declaration:
// items: Main portfolio data. 
//  - source+owner combined index might be useful for querying, but simple filtering works too.
//  - we primarily query by (source, owner) to replace chunks.
db.version(1).stores({
    items: '++id, [source+owner], symbol, isin', // Compound index for efficient deletion/querying by broker+owner
    files: 'id, source, owner, status'
});

export { db };
