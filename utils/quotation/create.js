import { insertData } from "../../server/api/postgre/index.js";
import formatJsDateToDatetime from "../../utils/index.js";

// let quotation_id
const created_at = formatJsDateToDatetime(new Date())

export default async function onMatCostSave(mat_cost_items, quotation_id, work_order_id, mat_cost_pvs_input, mat_cost_tax_input) {
    const item_promise = await onItemLoop(mat_cost_items, 'mat_cost', quotation_id, work_order_id)

    return [
        sendPostgreRequest({item: 'mat_cost_pvs_input', name: 'mat_cost_pvs_input', cost: mat_cost_pvs_input, quotation_id, work_order_id}),
        sendPostgreRequest({item: 'mat_cost_tax_input', name: 'mat_cost_tax_input', cost: mat_cost_tax_input, quotation_id, work_order_id}),
        ...item_promise
    ];
}

export async function onMiscCostSave(misc_cost_items, quotation_id, work_order_id) {
    return await onItemLoop(misc_cost_items, 'misc_cost', quotation_id, work_order_id);
}

export async function onSubconCostSave(sub_cost_items, quotation_id, work_order_id) {
    return await onItemLoop(sub_cost_items, 'subcon_cost', quotation_id, work_order_id)
}

export async function onLaborCostSave(labor_cost_items, quotation_id, work_order_id) {
    return [
        sendPostgreRequest({item: 'labor_cost', name: 'labor_hours', cost: labor_cost_items.laborHours, quotation_id, work_order_id}),
        sendPostgreRequest({item: 'labor_cost', name: 'labor_rate', cost: labor_cost_items.laborRate, quotation_id, work_order_id}),
        sendPostgreRequest({item: 'labor_cost', name: 'ot_hours', cost: labor_cost_items.overtimeHours, quotation_id, work_order_id}),
        sendPostgreRequest({item: 'labor_cost', name: 'ot_rate', cost: labor_cost_items.overtimeRate, quotation_id, work_order_id}),
    ];
}

export async function onBidPriceCostSave(gross_profit, quotation_id, work_order_id) {
    return [
        sendPostgreRequest({item: 'bid_price', name: 'mat_gp', cost: gross_profit.material, quotation_id, work_order_id}),
        sendPostgreRequest({item: 'bid_price', name: 'labor_gp', cost: gross_profit.labor, quotation_id, work_order_id}),
        sendPostgreRequest({item: 'bid_price', name: 'labor_ot_gp', cost: gross_profit.labor_ot, quotation_id, work_order_id}),
        sendPostgreRequest({item: 'bid_price', name: 'misc_gp', cost: gross_profit.miscellaneous, quotation_id, work_order_id}),
        sendPostgreRequest({item: 'bid_price', name: 'subcon_gp', cost: gross_profit.subcontract, quotation_id, work_order_id}),
        sendPostgreRequest({item: 'bid_price', name: 'extra_deduct', cost: gross_profit.extra_deduct, quotation_id, work_order_id}),
    ];
}

export async function handleApiResponse(responsePromise) {
    try {
        const response = await responsePromise;
        if (response) {
            return response
        } else {
            console.error('API call error:', err);
        }
    } catch (err) {
        console.error('API call catch error:', err);
    }
};

async function onItemLoop(costs, item_name, quotation_id, work_order_id) {
    // console.log('onItemLoop: ', costs, item_name, quotation_id, work_order_id);
    const promises = []
    if (costs?.length > 0) {
        const item_promise = costs.map((item) =>
            sendPostgreRequest({item: item_name, name: item.name, cost: item.cost, quotation_id, work_order_id})
        );
        promises.push(...item_promise);
    }

    return promises
}

const sendPostgreRequest = async ({item, name, cost, quotation_id, work_order_id}) => {
    // console.log('sendPostgreRequest: ', quotation_id, item, name, cost);
    const data = insertData('quotation_details', ['quotation_id', 'created_at', 'work_order_id', 'item', 'name', 'cost'],[quotation_id, created_at, work_order_id, item, name, cost])
    return handleApiResponse(
        data
    );
};