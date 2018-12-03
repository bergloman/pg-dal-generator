import { DbAccess } from "./pg_access";
import { parseCommandLine } from "./cmdline";

enum ActionEnum {
    Unknown,
    Consts,
    Classes
}

async function run(
    action: ActionEnum, con_str: string, schema: string,
    nspace: string, map: Map<string, string>
): Promise<void> {
    try {
        const db = DbAccess.create(con_str);

        const res = await db.any(`SELECT * FROM information_schema.tables where table_schema = '${schema}';`);
        const columns = {};
        const tables = {};
        let indent = "";
        if (nspace && nspace.length > 0) {
            indent = "    ";
            console.log(`export namespace ${nspace} {`);
        }
        for (const tab of res) {

            tables[tab.table_name] = tab.table_schema + "." + tab.table_name;

            if (action == ActionEnum.Classes) {
                console.log(indent + "export class", tab.table_name, "{");
            }

            const fields = await db.any(
                `SELECT * FROM information_schema.columns ` +
                `where table_schema = '${tab.table_schema}' and table_name = '${tab.table_name}';`);

            const tabFields = {};
            for (const field of fields) {
                if (field.column_name == "id") {
                    continue;
                }
                if (action == ActionEnum.Classes) {
                    const output_type = map.get(field.udt_name) || "ERROR=" + field.udt_name;
                    console.log(indent + `    ${field.column_name}: ${output_type};`);
                }
                tabFields[field.column_name] = field.column_name;
            }
            if (action == ActionEnum.Classes) {
                console.log(indent + "}");
            }
            columns[tab.table_name] = tabFields;
        }
        if (action == ActionEnum.Consts) {
            console.log(indent + "export const Tables =", JSON.stringify(tables, null, "    ") + ";");
            console.log(indent + "export const Columns =", JSON.stringify(columns, null, "    ") + ";");
        }
        db.close();
        if (nspace && nspace.length > 0) {
            console.log(`}`);
        }

    } catch (err) {
        console.log("ERROR:");
        console.log(err);
    }
}

function prepareTypeMapping() {
    const map: Map<string, string> = new Map<string, string>();
    map.set("int4", "number");
    map.set("float8", "number");
    map.set("timestamp", "Date");
    map.set("varchar", "string");
    map.set("bool", "boolean");
    map.set("json", "any");
    return map;
}

function printUsage() {
    console.log("Action parameters: consts, classes");
}

function parseCmdLine() {
    const cmd_line = parseCommandLine(process.argv.slice(2));

    const host = cmd_line.h || "localhost";
    const port = cmd_line.port || "5432";
    const db = cmd_line.db;
    const con_str = `postgres://${cmd_line.u}:${cmd_line.p}@${host}:${port}/${db}`;
    const schema = cmd_line.schema || "";
    const a = cmd_line.a || cmd_line.action || "consts";
    const nspace = cmd_line.n || cmd_line.namespace || "";
    const action: ActionEnum = (
        a == "consts" ? ActionEnum.Consts :
            a == "classes" ? ActionEnum.Classes :
                ActionEnum.Unknown);
    if (action == ActionEnum.Unknown) {
        printUsage();
        process.exit(10);
    }
    return { con_str, schema, action, nspace };
}

///////////////////////////////////////////////

(async () => {
    const { con_str, schema, action, nspace } = parseCmdLine();
    run(action, con_str, schema, nspace, prepareTypeMapping());
})();

