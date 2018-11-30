import { DbAccess } from "./pg_access";

async function run(con_str: string, schema: string, map: Map<string, string>): Promise<void> {
    const db = DbAccess.create(con_str);

    const res = await db.any(`SELECT * FROM information_schema.tables where table_schema = '${schema}';`);
    const Consts = {};
    for (const tab of res) {

        console.log("class", /*tab.table_schema,*/ tab.table_name, "{");

        const fields = await db.any(
            `SELECT * FROM information_schema.columns ` +
            `where table_schema = '${tab.table_schema}' and table_name = '${tab.table_name}';`);

        const tabFields = {};
        for (const field of fields) {
            if (field.column_name == "id") {
                continue;
            }
            const output_type = map.get(field.udt_name) || "ERROR=" + field.udt_name;
            console.log(`    ${field.column_name}: ${output_type};`);
            tabFields[field.column_name] = field.column_name;
        }
        console.log("}")
        Consts[tab.table_name] = tabFields;
    };
    console.log(Consts);
}

function prepareTypeMapping() {
    const map: Map<string, string> = new Map<string, string>();
    map.set("int4", "numeric");
    map.set("float8", "numeric");
    map.set("timestamp", "Date");
    map.set("varchar", "string");
    map.set("bool", "boolean");
    map.set("json", "any");
    return map;
}

///////////////////////////////////////////////

const map: Map<string, string> = prepareTypeMapping();

run("......", ".....", map);

