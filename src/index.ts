import { DbAccess } from "./pg_access";
import { parseCommandLine } from "./cmdline";

enum ActionEnum {
    Unknown,
    Consts,
    Classes
}

async function run(
    actions: ActionEnum[], con_str: string, schema: string,
    nspace: string, map: Map<string, string>
): Promise<void> {
    const do_clasess = actions.includes(ActionEnum.Classes);
    const do_consts = actions.includes(ActionEnum.Consts);
    const db = DbAccess.create(con_str);
    try {
        const res = await db.any(
            `SELECT * FROM information_schema.tables ` +
            `where table_schema = '${schema}' order by table_name;`);
        const columns = {};
        const tables = {};
        let indent = "";
        if (nspace && nspace.length > 0) {
            indent = "    ";
            console.log(`export namespace ${nspace} {`);
        }
        for (const tab of res) {

            tables[tab.table_name] = tab.table_schema + "." + tab.table_name;

            if (do_clasess) {
                console.log(indent + "export class", tab.table_name, "{");
            }

            const fields = await db.any(
                `SELECT * FROM information_schema.columns ` +
                `where table_schema = '${tab.table_schema}' and table_name = '${tab.table_name}' ` +
                `order by column_name;`);

            const tabFields = {};
            for (const field of fields) {
                if (field.column_name == "id") {
                    continue;
                }
                if (do_clasess) {
                    let output_type = map.get(field.udt_name) || "ERROR=" + field.udt_name;
                    if (output_type.startsWith("ERROR")) {
                        if (field.data_type == "USER-DEFINED") {
                            output_type = "string";
                        } else {
                            console.log(indent + "    // ", JSON.stringify(field));
                        }
                    }
                    console.log(indent + `    public ${field.column_name}: ${output_type};`);
                }
                tabFields[field.column_name] = field.column_name;
            }
            if (do_clasess) {
                console.log(indent + "}");
            }
            columns[tab.table_name] = tabFields;
        }

        if (do_consts) {
            console.log(indent + "export const TABLES = {");
            for (const tab_name of Object.keys(tables)) {
                console.log(indent + `    ${tab_name}: "${tables[tab_name]}",`);
            }
            console.log(indent + "};");

            console.log(indent + "export const COLUMNS = {");
            for (const tab_name of Object.keys(columns)) {
                const tab_cols = columns[tab_name];
                console.log(indent + `    ${tab_name}: {`);
                for (const col_name of Object.keys(tab_cols)) {
                    console.log(indent + `        ${col_name}: "${tab_cols[col_name]}",`);
                }
                console.log(indent + `    },`);
            }
            console.log(indent + "};");
        }
        db.close();
        if (nspace && nspace.length > 0) {
            console.log(`}`);
        }

    } catch (err) {
        db.close();
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

    const a_list = a.split(",");
    const actions: ActionEnum[] = a_list.map(x => (
        x == "consts" ? ActionEnum.Consts :
            x == "classes" ? ActionEnum.Classes :
                ActionEnum.Unknown)
    );
    if (actions.filter(x => x == ActionEnum.Unknown).length > 0) {
        printUsage();
        process.exit(10);
    }
    return { con_str, schema, actions, nspace };
}

///////////////////////////////////////////////

(async () => {
    const { con_str, schema, actions, nspace } = parseCmdLine();
    run(actions, con_str, schema, nspace, prepareTypeMapping());
})();

