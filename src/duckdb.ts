import * as duckdb from '@duckdb/duckdb-wasm';

export class DuckDBHandler {
    private db: duckdb.AsyncDuckDB | null = null;
    private conn: duckdb.AsyncDuckDBConnection | null = null;

    async initialize() {
        // Get the wasm files URL
        const DUCKDB_BUNDLES = {
            mvp: {
                mainModule: new URL(
                    '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm',
                    import.meta.url
                ).href,
                mainWorker: new URL(
                    '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js',
                    import.meta.url
                ).href,
            },
            eh: {
                mainModule: new URL(
                    '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm',
                    import.meta.url
                ).href,
                mainWorker: new URL(
                    '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js',
                    import.meta.url
                ).href,
            },
        };

        // Select bundle based on browser capability
        const bundle = await duckdb.selectBundle(DUCKDB_BUNDLES);

        // Create a worker
        const worker = new Worker(bundle.mainWorker!);
        const logger = new duckdb.ConsoleLogger();
        
        this.db = new duckdb.AsyncDuckDB(logger, worker);
        await this.db.instantiate(bundle.mainModule);
        this.conn = await this.db.connect();
    }

    async loadFile(file: File): Promise<string> {
        if (!this.conn) throw new Error("Database not initialized");
        
        const fileType = file.name.split('.').pop()?.toLowerCase();
        const tableName = 'data_table';
        
        const buffer = await file.arrayBuffer();
        await this.db!.registerFileBuffer(file.name, new Uint8Array(buffer));
        
        if (fileType === 'csv') {
            await this.conn.query(`DROP TABLE IF EXISTS ${tableName}`);
            await this.conn.query(`CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${file.name}')`);
        } else if (fileType === 'json') {
            await this.conn.query(`DROP TABLE IF EXISTS ${tableName}`);
            await this.conn.query(`CREATE TABLE ${tableName} AS SELECT * FROM read_json_auto('${file.name}')`);
        } else {
            throw new Error("Unsupported file type. Please use CSV or JSON files.");
        }

        const schema = await this.getTableSchema(tableName);
        return schema;
    }

    private async getTableSchema(tableName: string): Promise<string> {
        if (!this.conn) throw new Error("Database not initialized");
        const result = await this.conn.query(`DESCRIBE ${tableName}`);
        return JSON.stringify(result.toArray());
    }

    async executeQuery(query: string) {
        if (!this.conn) throw new Error("Database not initialized");
        try {
            const result = await this.conn.query(query);
            return result.toArray();
        } catch (error) {
            console.error("Query execution error:", error);
            throw error;
        }
    }
}