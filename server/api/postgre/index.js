import { neon } from '@netlify/neon';
const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

export default async function getData(table, isDesc = false) {
    try {
        const query = `SELECT * FROM ${table} ORDER BY id ${isDesc ? 'DESC' : 'ASC'} LIMIT 1000`;
        const data = await sql(query);
        // console.log('data ', data)

        return { data };
    } catch (error) {
        console.error(`Error fetching ${table}:`, error);
    }
}

export async function insertData(table, fields, values) {
    try {
        if (values.length < 1) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Fields is required'
            })
        }
        const quotedFields = fields.map((field) => {
            if (field === 'from' || field === 'to') {
                return `"${field}"`;
            }
            return field;
        });
        const placeholders = fields.map((field, index) => `$${index+1}`).join(", "); // e.g., '$1, $2, $3'
        // console.log('placeholders ', placeholders)

        const query = `INSERT INTO ${table} (${quotedFields.join(", ")})
                VALUES (${placeholders}) RETURNING *`;
        // console.log('query ', query)
        const [data] = await sql(query, values);

        return data;
    } catch (error) {
        console.error(`Error creating ${table}:`, error)
    }
}

export async function updateData(table, id, fields, values, dynamic_field, dynamic_value = null) {
    try {
        if (!id || isNaN(Number(id))) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid item ID' })
        }
        const value = dynamic_value ?? id
        if (values.length < 1) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Fields is required'
            })
        }

        const setClauses = Object.keys(fields)
            .map((key, i) => `${key} = $${i+1}`)
            .join(", "); // e.g., "name = $1, email = $2, age = $3"
        // console.log('setClauses ', setClauses)
        const query = `
          UPDATE ${table}
          SET ${setClauses}
          WHERE ${dynamic_field} = ${value}
          RETURNING *
        `;
        const result = await sql(query, values);
        // console.log('result ', result)

        if (result.length === 0) {
          return { error: 'Entry not found', statusCode: 404 };
        }

        return { message: 'Item updated successfully', id: Number(id), data: result }
    } catch (error) {
        console.error(`Error updating ${table}:`, error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || `Failed to update ${table}`
        })
    }
}

export async function getOneData(table, id, dynamic_field = 'id') {
    try {
        if (!id || isNaN(Number(id))) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid item ID' })
        }

        const query = `SELECT * FROM ${table} WHERE ${dynamic_field} = $1`
        const rows = await sql(query, [id]);
        // console.log('rows ', rows)

        if (rows.length === 0) {
            throw createError({ statusCode: 404, statusMessage: 'Item not found' })
        }

        return { data: rows[0] }
    } catch (error) {
        console.error(`Error fetching single ${table}:`, error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || `Failed to fetch ${table}`
        })
    }
}

export async function deleteOneData(table, dynamic_field, dynamic_value) {
    try {
        if (!dynamic_field || !dynamic_value) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid item' })
        }

        const query = `
          DELETE FROM ${table}
          WHERE ${dynamic_field} = ${dynamic_value}
          RETURNING *
        `;

        const deletedItem = await sql(query);
        // console.log('deletedItem ', deletedItem)

        if (!deletedItem) {
          return { error: 'ID not found', statusCode: 404 };
        }

        return { message: 'Item deleted successfully', data: deletedItem }
    } catch (error) {
        console.error(`Error deleting ${table}:`, error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || `Failed to delete ${table}`
        })
    }
}

export async function getDynamicField(table, value, dynamic_field = 'id') {
    try {
        if (!dynamic_field) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid item' })
        }

        const query = `SELECT * FROM ${table} WHERE ${dynamic_field} = $1`
        const rows = await sql(query, [value]);
        // console.log('rows ', rows)

        if (!rows) {
            throw createError({ statusCode: 404, statusMessage: 'Item not found' })
        }

        if (rows.length === 0) {
            return { data: [] }
        }

        return { data: rows }
    } catch (error) {
        console.error(`Error fetching single ${table}:`, error)
    }
}

