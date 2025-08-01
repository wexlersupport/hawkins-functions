import { neon } from '@netlify/neon';
const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

export default async function getGroupByWorkOrderId(table, selectedFields, dynamic_field, dynamic_values, groupby_field) {
    try {
        const query = `SELECT ${selectedFields} FROM ${table} WHERE ${dynamic_field} IN (${dynamic_values.join(", ")}) GROUP BY ${groupby_field}`;
        // SELECT work_order_id
        // FROM quotation_details
        // WHERE work_order_id IN (123472, 123509, 123457)
        // GROUP BY work_order_id;
        const data = await sql(query);
        // console.log('data ', data)
        const transformedData = data.map(row => Number(row[groupby_field]));

        return { data: transformedData };
    } catch (error) {
        console.error(`Error fetching ${table}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to fetch ${table}`,
        });
    }
}