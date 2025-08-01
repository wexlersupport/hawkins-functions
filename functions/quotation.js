import 'dotenv/config'

import path from 'path';
import fs from 'fs';
import CronJob from "node-cron"
import getData, {deleteOneData, insertData, getDynamicField} from "../server/api/postgre/index.js";
import getGroupByWorkOrderId from "../server/api/postgre/quotation_details.js";
import fetchDynamicMax from "../server/api/postgre/dynamic_max.js";
import fetchWorkOrderId from "../server/api/vista/work-order-id.js";
import fetchCustomerId from "../server/api/vista/customer-id.js";
import combinedSingleObjectMatchSearch from "../utils/search_materials.js";
import sendEmail from '../utils/sendgrid_helper.js'
import generatePdf from '../utils/pdfmake_helper.js'
import formatJsDateToDatetime from "../utils/index.js";
import onMatCostSave, { onMiscCostSave, onSubconCostSave, onLaborCostSave, onBidPriceCostSave } from "../utils/quotation/create.js";

let mat_cost_items = []
let misc_cost_items = []
let sub_cost_items = []
let labor_cost_items = {
    laborHours: 8,
    overtimeHours: 0.5,
    laborRate: 55,
    overtimeRate: 82.50
}
let gross_profit = {
    material: 45,
    labor: 145.00,
    labor_ot: 217.50,
    miscellaneous: 45,
    subcontract: 30,
    extra_deduct: 0
}

const mat_cost_pvs_input = 10
const mat_cost_tax_input = 6

let quotationDetails, workOrderDetail, customerDetail

export default async function generateQuotation() {
    const quotationJob = CronJob.schedule("*/10 * * * * *", async () => {
        console.log(`[${formatJsDateToDatetime(new Date())}]: Generate quote job running every 5 minutes`);
        await logs()

        const new_work_order = [123472, 123509, 123457]
        if (new_work_order.length > 0) {
            const { data } = await getGroupByWorkOrderId('quotation_details', 'work_order_id', 'work_order_id', new_work_order, 'work_order_id');
            // console.log('getGroupByWorkOrderId: ', new_work_order, data);
            const potential_missing_work_order = await findMissingElements(new_work_order, data);
            // console.log('potential_missing_work_order: ', potential_missing_work_order);
            if (potential_missing_work_order.length === 0) {
                console.log('No new work orders found.');
                return;
            }

            const materials = await fetchMaterials();
            // console.log('Materials fetched: ', materials.length);

            const search_value = ['wall plate', '120v', 'cable'];
            await onAutoGenerateMaterials(search_value, materials);
            // console.log('mat_cost_items: ', mat_cost_items);

            potential_missing_work_order.forEach(async (work_order_id) => {
                // work_order_id = id;
                // const { response } = await fetchWorkOrderId(id);
                // console.log('fetchWorkOrderId: ', response.WorkOrder);
                await onSave(work_order_id);
            });
        }
    })

    quotationJob.start();
}

async function onSave(work_order_id) {
    const max = await fetchDynamicMax('quotation_details', 'quotation_id');
    // console.log('fetchDynamicMax: ', max);

    const quotation_id = (Number(max) + 1) || 0;
    const mat_promises = await onMatCostSave(mat_cost_items, quotation_id, work_order_id, mat_cost_pvs_input, mat_cost_tax_input);
    const misc_promises = await onMiscCostSave(misc_cost_items, quotation_id, work_order_id);
    const subcon_promises = await onSubconCostSave(sub_cost_items, quotation_id, work_order_id);
    const labor_promises = await onLaborCostSave(labor_cost_items, quotation_id, work_order_id);
    const bidprice_promises = await onBidPriceCostSave(gross_profit, quotation_id, work_order_id);

    const promisesAll = [...mat_promises, ...misc_promises, ...subcon_promises, ...labor_promises, ...bidprice_promises];
    Promise.all(promisesAll).then(async (response) => {
        console.log('All promises resolved: ', quotation_id, work_order_id, response.length);

        quotationDetails = await getDynamicField('quotation_details', quotation_id, 'quotation_id')
        // console.log('quotationDetails ', quotationDetails.data.length);

        workOrderDetail = { value: {
                WorkOrder: 'asdf',
                Customer: 1,
                CustGroup: 1,
                ServiceSite: 'asdf',
                ServiceCenter: 'asdf',
                EnteredBy: 'asdf',
                LeadTechnician: 'asdf',
                WOStatus: 'asdf',
                ScopeDetails: [{
                    CallType: 'asdf',
                    WorkScope: 'asdf',
                    BillToARCustomer: 'asdf',
                    Description: 'asdf',
                    CustomerPO: 'asdf',
                    PriorityName: 'asdf',
                    IsTrackingWIP: 'asdf',
                    PriceMethod: 'asdf',
                    UseAgreementRates: 'asdf',
                    IsPreventativeMaintenance: 'asdf',
                    RevenueRecognition: 'asdf',
                    RateTemplate: 'asdf'
                }]
            }
        }

        const { response: res } = await fetchCustomerId(workOrderDetail.value.Customer, workOrderDetail.value.CustGroup);
        // console.log('fetchCustomerId: ', res);

        customerDetail = { value: res }

        const pdfDoc = generatePdf({
            quotation_id,
            work_order_id,
            quotation_details: quotationDetails.data,
            work_order_details: workOrderDetail.value,
            customer_details: customerDetail.value
        })
        // console.log('pdfDoc ', pdfDoc)

        pdfDoc.getBase64(async (data) => {
            const name = workOrderDetail.value?.ContactName ?? customerDetail.value?.Name
            let emailObj = {
                from: 'francis.regala@strattonstudiogames.com',
                to: 'pantet008@gmail.com',
                subject: `${name} - WO#${work_order_id} - Quote#${quotation_id}`,
                html: '<p>Hi,</p><p><br></p><p>See the attached quote and let me know how you would like to proceed.</p><p><br></p><p>Thank you.</p>',
                filename: `${`${name}_${work_order_id}_${quotation_id}`}.pdf`,
                content: data,
            }
            // console.log('emailObj ', emailObj)
            // const email_res = await sendEmail(emailObj)
            const email_res = true
            // console.log('email_res ', email_res)

            if (email_res) {
                delete emailObj.content

                let fields = Object.keys(emailObj)
                fields = [...fields, 'created_at', 'status', 'quotation_id', 'work_order_id']
                // console.log('fields', fields)
                
                const created_at = formatJsDateToDatetime(new Date())
                let values = Object.values(emailObj)
                values = [...values, created_at, 'sent', quotation_id, work_order_id]
                // console.log('values', values)
                
                const data = await insertData('email', fields, values)
                console.log('data', data)
            }
        })
    }).catch(async (error) => {
        console.log("Promise.all caught an error:", error);

        setTimeout(async () => {
            const deleteItem = await deleteOneData('quotation_details', 'quotation_id', quotation_id);
            console.log('Error occurred, deleting item: ', deleteItem.data.length);
        }, 1000);
    })
    .finally(() => {
        // console.log("Promise.all finished.");
    });

    return null
}

async function costs() {
    let materialCosts = 0
    if (mat_cost_items?.length > 0) {
        materialCosts = ((mat_cost_items.reduce((acc, item) => acc + item.cost, 0) +
            (mat_cost_items.reduce((acc, item) => acc + item.cost, 0) * mat_cost_pvs_input / 100) +
            (mat_cost_items.reduce((acc, item) => acc + item.cost, 0) +
            (mat_cost_items.reduce((acc, item) => acc + item.cost, 0) * mat_cost_pvs_input / 100)) *
            mat_cost_tax_input / 100) || 0)
    }
    return {
        materialCosts,
        miscellaneousCosts: misc_cost_items.reduce((acc, item) => acc + item.cost, 0) || 0,
        subscontractCosts: sub_cost_items.reduce((acc, item) => acc + item.cost, 0) || 0,
        laborCosts: labor_cost_items || [],
        gross_profit: gross_profit || {}
    }
}

async function onAutoGenerateMaterials(search_value, material_list) {
    const searchResultsAsObjects = combinedSingleObjectMatchSearch(search_value, material_list);
    // console.log('Search Results:', searchResultsAsObjects);
    if (searchResultsAsObjects) {
        mat_cost_items = [];
        searchResultsAsObjects.forEach((term) => {
            if (term) {
                mat_cost_items.push({
                    search_term: term.search_term,
                    name: term.name,
                    cost: Number(term.cost),
                })
            }
        });

        misc_cost_items = [];
        misc_cost_items.push({
            name: 'Miscellaneous Test1',
            cost: 101,
        });
        misc_cost_items.push({
            name: 'Miscellaneous Test2',
            cost: 101.55,
        });

        sub_cost_items = [];
        sub_cost_items.push({
            name: 'Subcontract Test1',
            cost: 101,
        });
        sub_cost_items.push({
            name: 'Subcontract Test2',
            cost: 101.55,
        });
    }
}

async function findMissingElements(arr1, arr2) {
  const set2 = new Set(arr2);

  return arr1.filter(item => !set2.has(item));
}

async function fetchMaterials() {
    const { data } = await getData('materials', true);

    return data || [];
}

async function logs() {
    const filename = `${formatJsDateToDatetime(new Date(), 'date_underscore')}.txt`
    const filesDirectory = path.join('./logs');

    if (!fs.existsSync(filesDirectory)) {
        fs.mkdirSync(filesDirectory);
    }

    const filePath = path.join(filesDirectory, filename);
    if (!fs.existsSync(filePath)) {
        const date_time = `[${formatJsDateToDatetime(new Date())}]:`
        let msg = `${date_time} File '${filename}' created successfully.`
        fs.writeFile(filePath, `${msg} \n`, (err) => {
            if (err) {
                console.error(`${date_time} Error creating file:`, err);
            }
            console.log(msg)
        });
    } else {
        fs.access(filePath, fs.constants.F_OK, (err) => {
            const date_time = `[${formatJsDateToDatetime(new Date())}]:`
            let msg = `${date_time} Content appended to '${filename}' successfully.`
            if (err) {
                console.error(`${date_time} File '${filename}' not found. Cannot append.`)
                msg = `${date_time} File '${filename}' not found. Cannot append.`
            }

            // File exists, proceed with appending
            fs.appendFile(filePath, `${msg} \n`, (err) => { // Adding '\n' for new line
                if (err) {
                    console.error(`${date_time} Error appending to file:`, err);
                }
                console.log(msg)
            });
        });
    }
}