import * as pg from "pg-promise";

export namespace DbAccess {

    /** Singleton object for postgres interraction */
    const pgMain = pg();


    /** Abstraction of database access */
    export interface IDbAccess {

        /** Utility function for retrieving data from database */
        any(sql: string, params?: any): Promise<any[]>;

        /** Utility function for executing statement on database */
        execute(sql: string, params?: any): Promise<any>;
    }

    /** PostgreSQL access class */
    export class DbAccessPostgres implements IDbAccess {

        /** Database connection */
        private db: pg.IDatabase<{}>;

        /** Contructor that receives postgres connection */
        constructor(db: pg.IDatabase<{}>) {
            this.db = db;
        }

        /** Utility function for retrieving data from database */
        public async any(sql: string, params?: any): Promise<any[]> {
            return await this.db.any(sql, params);
        }

        /** Utility function for executing statement on database */
        public async execute(sql: string, params?: any): Promise<any> {
            return await this.db.result(sql, params);
        }
    }

    /** Factory function */
    export function create(conStr: string): DbAccessPostgres {
        const db = pgMain(conStr);
        return new DbAccessPostgres(db);
    }
}
