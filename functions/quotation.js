import 'dotenv/config'

import path from 'path';
import fs from 'fs';
import CronJob from "node-cron"
import getData, {deleteOneData, insertData, getDynamicField} from "../server/api/postgre/index.js";
import getGroupByWorkOrderId from "../server/api/postgre/quotation_details.js";
import fetchDynamicMax from "../server/api/postgre/dynamic_max.js";
import fetchWorkOrderId from "../server/api/vista/work-order-id.js";
import fetchWorkCompleted from "../server/api/vista/work-completed-search.js";
import getWorkOrderTrips from '../server/api/vista/field_service/work_order_trips.js';
import isLogin from '../server/api/vista/field_service/Is_login.js';
import fetchWorkOrder from "../server/api/vista/work-order-search.js";
import fetchCustomerId from "../server/api/vista/customer-id.js";
import generateScopeOfWork from '../server/api/openrouter-ai/scope-of-works.js';
import combinedSingleObjectMatchSearch from "../utils/search_materials.js";
import sendEmail from '../utils/sendgrid_helper.js'
import generatePdf from '../utils/pdfmake_helper.js'
import formatJsDateToDatetime, {convertDate} from "../utils/index.js";
import onMatCostSave, { onMiscCostSave, onSubconCostSave, onLaborCostSave, onBidPriceCostSave } from "../utils/quotation/create.js";
import { fetchFieldServiceAttachmentsList, processUrl } from '../utils/process_pdf_url.js';

let mat_cost_items = []
let misc_cost_items = []
let sub_cost_items = []
let work_completed = []
let labor_cost_items = {
    laborHours: 0,
    overtimeHours: 0,
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
    const materials = await fetchMaterials();

    const quotationJob = CronJob.schedule("*/5 * * * *", async () => {
        console.log(`[${formatJsDateToDatetime(new Date())}]: Generate quote job running every 5 minutes`);
        await logs('initial')
        // console.log('Materials fetched: ', materials.length);
        const { data: config_all } = await getData('configuration');
        const fs_cookie = config_all?.find((item) => item.config_key === 'fs_cookie')
        const { response: isLoggedIn } = await isLogin(fs_cookie?.config_value || '')
        // console.log('Field Service isLoggedIn: ', isLoggedIn);
        if (!isLoggedIn) {
            console.log(`[${formatJsDateToDatetime(new Date())}]: Unauthorized to access Field Service Data. Please login to continue.`);
            console.log(`[${formatJsDateToDatetime(new Date())}]: Script terminated due to unauthorized access.`);

            return
        }

        // const new_work_order = [120031, 122630, 122623, 123018, 123476]
        const today = new Date();
        const dateAfter = new Date(today);
        dateAfter.setDate(today.getDate() - 15);
        const filterObj = [
            {
                value: convertDate(dateAfter),
                propertyName: 'RequestedDate',
                operator: 'GreaterThanOrEqual'
            },
            {
                propertyName: 'Description',
                value: 'to be quoted',
                operator: 'Contains'
            },
        ]
        const { response: res } = await fetchWorkOrder(filterObj)
        const new_work_order = res.data.map(item => item.WorkOrder);
        console.log('Work Orders with "to be quoted" in description: ', new_work_order);

        if (new_work_order.length > 0) {
            new_work_order.forEach(async (work_order_id) => {
                const filterObj = {value: +work_order_id, propertyName: 'WorkOrder', operator: 'Equal'}
                const { response: res } = await fetchWorkCompleted(filterObj)
                const work_completed = res?.data || []

                quotationDetails = await getDynamicField('quotation_details', work_order_id, 'work_order_id')
                // console.log('Quotation Details for Order ID:', work_order_id, quotationDetails.data.length);

                if (quotationDetails.data.length > 0) {
                    const existing_costs = quotationDetails.data.filter((d) => d.item === 'mat_cost' || d.item === 'misc_cost')
                    // console.log('Work Completed for Order ID:', work_order_id, existing_costs.length, work_completed.length);

                    if (existing_costs.length < work_completed.length) {
                        // console.log('New work completed found for Order ID:', work_order_id, existing_costs.length, work_completed.length);
                        const deleteItem = await deleteOneData('quotation_details', 'work_order_id', work_order_id);
                        // console.log('Deleted existing quotation details for Order ID:', work_order_id, deleteItem.data.length);
                    }
                }
            })

            const { data } = await getGroupByWorkOrderId('quotation_details', 'work_order_id', 'work_order_id', new_work_order, 'work_order_id');
            // console.log('getGroupByWorkOrderId: ', new_work_order, data);
            const potential_missing_work_order = await findMissingElements(new_work_order, data);
            console.log('Work orders for quote creation: ', potential_missing_work_order);
            if (potential_missing_work_order.length === 0) {
                // console.log('No potential new work orders found.');
                await logs('without_potential_work_order')
                return;
            }
            await logs('with_potential_work_order', potential_missing_work_order)

            const { response: fs_data } = await getWorkOrderTrips(fs_cookie?.config_value || '')

            for (const [index, work_order_id] of potential_missing_work_order.entries()) {
                if (index > 0) {
                    break;
                }
                mat_cost_items = []
                misc_cost_items = []
                sub_cost_items = []
                labor_cost_items.laborHours = 0
                let fsDetail = null
                let scope_work = null

                if (fs_data && fs_data[0]?.WorkOrder) {
                    fsDetail = fs_data?.find((item) => item.WorkOrder === Number(work_order_id))
                    // console.log('Field Service Work Order: ', fsDetail)
                    if (!fsDetail) {
                        console.log('No Field Service data found for Work Order ID: ', work_order_id);
                    } else {
                        const fs_attachments_list = await fetchFieldServiceAttachmentsList(fsDetail, config_all)
                        // console.log('Field Service fs_attachments_list: ', fs_attachments_list)
                        if (fs_attachments_list && fs_attachments_list.length > 0) {
                            const fs_attachment = fs_attachments_list?.find((item) => {
                                return item?.AttachmentFileName.includes('Service Quote') || item?.AttachmentFileName.includes('Service_Quote') || item?.Description.includes('Service Quote') || item?.Description.includes('Service_Quote')
                            })
                            // console.log('Field Service fs_attachment: ', fs_attachment)
                            if (fs_attachment) {
                                const pdf_text = await processUrl(fs_attachment, config_all)
                                // console.log('Field Service pdf_text: ', pdf_text)

                                const scope_of_info_index = pdf_text?.findIndex((item) => item.includes('Scope Information') || item.includes('Scope of quote')) || 0
                                // console.log('Field Service scope_of_info_index: ', scope_of_info_index)
                                const material_index = pdf_text?.findIndex((item) => item.includes('Material')) || 0
                                // console.log('Field Service material_index: ', material_index)
                                scope_work = pdf_text?.slice(scope_of_info_index + 1, material_index).join('') || ''
                                // console.log('Field Service scope_work: ', scope_work)

                                const number_tech_index = pdf_text?.findIndex((item) => item.includes('Number of Tech') && !item.includes('Estimate')) || 0
                                // console.log('Field Service number_tech_index: ', number_tech_index)

                                const number_helper_index = pdf_text?.findIndex((item) => item.includes('Number of Helper') || item.includes('helper')) || 0
                                // console.log('Field Service number_helper_index: ', number_helper_index)

                                const hours_to_complete_index = pdf_text?.findIndex((item) => item.includes('Hours To Complete') || item.includes('Hour To Complete')) || 0
                                // console.log('Field Service hours_to_complete_index: ', hours_to_complete_index)

                                const page_number_index = pdf_text?.findIndex((item) => item.includes('1 of') || item.includes('Service Quote')) || 0
                                // console.log('Field Service page_number_index: ', page_number_index)

                                const number_tech = pdf_text?.slice(number_tech_index + 1, number_helper_index - 1).join('') || ''
                                // console.log('Field Service number_tech: ', number_tech)
                                let number_tech_lastdigit = number_tech.match(/\d+(?=\D*$)/) || [1];
                                number_tech_lastdigit = Number(number_tech_lastdigit[0])
                                console.log('Field Service number_tech_lastdigit: ', number_tech_lastdigit)
                                
                                const number_helper = pdf_text?.slice(number_helper_index + 1, hours_to_complete_index - 1).join('') || ''
                                // console.log('Field Service number_helper: ', number_helper)
                                let number_helper_lastdigit = number_helper.match(/\d+(?=\D*$)/) || [1];
                                number_helper_lastdigit = Number(number_helper_lastdigit[0])
                                console.log('Field Service number_helper_lastdigit: ', number_helper_lastdigit)

                                const hours_to_complete = pdf_text?.slice(hours_to_complete_index + 1, page_number_index - 1).join('') || ''
                                console.log('Field Service hours_to_complete: ', hours_to_complete)
                                let hours_to_complete_lastdigit = hours_to_complete.match(/\d+(?=\D*$)/) || [1];
                                hours_to_complete_lastdigit = Number(hours_to_complete_lastdigit[0])
                                if (hours_to_complete.includes('DAY') || hours_to_complete.includes('Day') || hours_to_complete.includes('day')) {
                                    hours_to_complete_lastdigit = hours_to_complete_lastdigit * 8
                                }
                                console.log('Field Service hours_to_complete_lastdigit: ', hours_to_complete_lastdigit)

                                const cost = hours_to_complete_lastdigit * (number_tech_lastdigit + number_helper_lastdigit)
                                labor_cost_items.laborHours = cost
                            } else {
                                console.log(`[${formatJsDateToDatetime(new Date())}]: No Field Service attachments found for Work Order ID ${work_order_id}.`);
                                const cost = fsDetail.EstimatedDuration + (fsDetail.ScopeData ? fsDetail.ScopeData[0]?.SummaryLaborHours : 0)
                                labor_cost_items.laborHours = cost
                            }
                        } else {
                            console.log(`[${formatJsDateToDatetime(new Date())}]: No Field Service attachments found for Work Order ID ${work_order_id}.`);
                            const cost = fsDetail.EstimatedDuration + (fsDetail.ScopeData ? fsDetail.ScopeData[0]?.SummaryLaborHours : 0)
                            labor_cost_items.laborHours = cost
                        }
                    }
                }

                const filterObj = {value: +work_order_id, propertyName: 'WorkOrder', operator: 'Equal'}
                const { response: res } = await fetchWorkCompleted(filterObj)
                work_completed = res?.data || [];
                // console.log('work_completed: ', work_order_id, work_completed.length);
                if (!work_completed || work_completed.length === 0) {
                    console.log('No work order completed available: ', work_order_id);
                } else {
                    await onAutoGenerateMaterials(work_completed, materials, work_order_id);
                    await onAutoGenerateMisc(work_completed, materials, work_order_id);
                }

                setTimeout(async () => {
                    await onSave(work_order_id, config_all, fsDetail, scope_work);
                }, index * 1000);
            }
        }
    })

    quotationJob.start();
}

async function onSave(work_order_id, config_all, fsDetail, scope_work) {
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

        const { response: workOrderResponse } = await fetchWorkOrderId(work_order_id)
        // console.log('fetchWorkOrderId: ', workOrderDetail);
        workOrderDetail = workOrderResponse;

        const { response: customerResponse } = await fetchCustomerId(workOrderDetail.Customer, workOrderDetail.CustGroup);
        // console.log('fetchCustomerId: ', customerResponse);
        customerDetail = customerResponse;

        const {response: generated_scope} = await generateScopeOfWork(workOrderDetail?.ScopeDetails[0]?.Description);

        const pdfDoc = generatePdf({
            quotation_id,
            work_order_id,
            config_all,
            generated_scope,
            quotation_details: quotationDetails.data,
            work_order_details: workOrderDetail,
            customer_details: customerDetail,
            field_service: fsDetail,
            scope_work: scope_work,
        })
        // console.log('pdfDoc ', pdfDoc)

        pdfDoc.getBase64(async (data) => {
            const name = fsDetail?.CustomerName ?? ''
            let emailObj = {
                from: 'francis.regala@strattonstudiogames.com',
                to: 'support@wexlerllc.com',
                subject: `${name} - WO#${work_order_id} - Quote#${quotation_id}`,
                html: `<p>Hi,</p><p><br></p><p>You have a new generated quotation available. Please see attached file for more details.</p><p><br></p><p>If you wish to edit the generated pdf quote, click link below.</p><p><a href="https://hawkins-webapp.netlify.app/quotation/${quotation_id}" rel="noopener noreferrer" target="_blank">Hawkins Electric Web Application Link</a></p><p><br></p><p>Thank you.</p>`,
                filename: `${`${name}_${work_order_id}_${quotation_id}`}.pdf`,
                content: data,
            }
            // console.log('emailObj ', emailObj)
            const email_res = await sendEmail(emailObj)
            // const email_res = true
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

async function onAutoGenerateMaterials(work_completed, material_list, work_order_id) {
    // Type = 4 is for materials
    const search_value = work_completed?.filter((item) => item.Type === 4).map((_item) => _item.Description) || [];
    // console.log('Search Value:', search_value);
    if (!search_value || search_value.length === 0) {
        console.log('No search terms provided.');
        return;
    }

    const searchResultsAsObjects = combinedSingleObjectMatchSearch(search_value, material_list);
    // console.log('Search Results:', searchResultsAsObjects.length);
    if (searchResultsAsObjects) {
        searchResultsAsObjects.forEach((term) => {
            if (term) {
                mat_cost_items.push({
                    work_order_id,
                    search_term: term.search_term,
                    name: term.name,
                    cost: Number(term.cost),
                })
            }
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

async function onAutoGenerateMisc(work_completed, material_list, work_order_id) {
    // Type = 2,3,5 is for miscellaneous
    const search_value = work_completed?.filter((item) => item.Type !== 4)
    console.log('Misc Search Value:', search_value.length);

    search_value.forEach((item, index) => {
        misc_cost_items.push({
            work_order_id,
            name: item.Description || 'Miscellaneous ' + (index + 1),
            cost: Number(item.PriceTotal) || Number(item.CostRate) || 0,
        })
    });
}

async function findMissingElements(arr1, arr2) {
  const set2 = new Set(arr2);

  return arr1.filter(item => !set2.has(item));
}

async function fetchMaterials() {
    const { data } = await getData('materials', true);

    return data || [];
}

async function logs(sequence = 'initial', potential_missing_work_order = []) {
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
        const date_time = `[${formatJsDateToDatetime(new Date())}]:`
        if (sequence === 'initial') {
            fs.access(filePath, fs.constants.F_OK, (err) => {
                let msg = `${date_time} Initially run the node script and logs successfully.`
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
        } else if (sequence === 'with_potential_work_order') {
            fs.access(filePath, fs.constants.F_OK, (err) => {
                let msg = `${date_time} Work orders for quote creation: ${potential_missing_work_order.join()} and logs successfully.`
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
        } else if (sequence === 'without_potential_work_order') {
            fs.access(filePath, fs.constants.F_OK, (err) => {
                let msg = `${date_time} No Work orders for quote creation and logs successfully.`
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
}