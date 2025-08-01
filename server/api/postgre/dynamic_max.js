import { neon } from '@netlify/neon';
const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

export default async function fetchDynamicMax(table, dynamic_field) {
    try {
        if (!dynamic_field) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid item' })
        }

        const query = `SELECT MAX(${dynamic_field}) FROM ${table}`
        const rows = await sql(query);
        // console.log('rows ', rows)

        if (rows.length === 0) {
            throw createError({ statusCode: 404, statusMessage: 'Item not found' })
        }

        return rows[0].max || 1000
    } catch (error) {
        console.error(`Error fetching single ${table}:`, error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || `Failed to fetch ${table}`
        })
    }
}