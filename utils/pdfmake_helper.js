import PdfPrinter from 'pdfmake'
import pdfMake from 'pdfmake/build/pdfmake.js';
import path from 'path';
import getFinalPrice, { convertNumberToWords } from "../utils/quotation/computation.js"
import exportBase64Logo from "../utils/quotation/base64_logo.js";
import pdfFonts from 'pdfmake/build/vfs_fonts.js';
import { convertDateFormat } from '../utils/index.js'

export default function generatePdf({quotation_id, work_order_id, quotation_details, work_order_details, customer_details, generated_scope, config_all}) {
  // Define your PDF document structure using pdfmake's declarative syntax
  const company_name = work_order_details?.ServiceSite ?? customer_details?.Name
  const address_name = `${customer_details?.BillAddress} ${customer_details?.BillCity}, ${customer_details?.BillState} ${customer_details?.BillZip}`
  const contact_name = work_order_details?.ContactName ?? customer_details?.Name
  const pdf_name = `${contact_name}_${work_order_id}_${quotation_id}`
  const contact_phone = work_order_details?.ContactPhone ?? customer_details?.Phone
  let scope_work = work_order_details?.ScopeDetails[0].Description ?? '';
  if (work_order_details?.ScopeDetails.length > 0) {
    const details = work_order_details?.ScopeDetails.filter((item) => !item.Description.includes('New Scope')) ?? [];
    scope_work = details.map((item) => item.Description) ?? [];
    if (generated_scope?.choices?.length > 0) {
      const config_scope_of_works = config_all.find((item) => item.config_key === 'scope_of_works')
      if (generated_scope?.choices?.length > 0 && config_scope_of_works?.config_value === 'true') {
        scope_work = [generated_scope?.choices[0]?.message?.content];
      }
    }
  }
  const quote_date = convertDateFormat(quotation_details[0]?.created_at) ?? ''
  const final_price = getFinalPrice(quotation_details) ?? 0
  const final_price_word = convertNumberToWords(final_price, { currencyName: "dollar", currencyNamePlural: "dollars", subCurrencyName: "cent", subCurrencyNamePlural: "cents", leadingAnd: true })
  let content = [
    {
      columns: [
        { text: "Date:", width: 30 },
        { text: quote_date, style: { bold: true, color: "#000" }},
      ],
      style: {
        fontSize: 10,
        color: "#333333"
      },
      margin: [0, 10, 0, 10]
    },
    {
      columns: [
        {
          layout: {
            hLineWidth: function (i, node) {
              return i === 0 || i === node.table.body.length ? 1 : 0.5;
            },
            vLineWidth: function (i, node) {
              return i === 0 || i === node.table.widths.length ? 0 : 0;
            },
            hLineColor: function (i, node) {
              return i === 0 || i === node.table.body.length
                ? "#000000"
                : "#CCCCCC";
            },
            vLineColor: function (i, node) {
              return "#000000";
            },
            paddingLeft: function (i, node) {
              return 5;
            },
            paddingRight: function (i, node) {
              return 5;
            },
            paddingTop: function (i, node) {
              return 8;
            },
            paddingBottom: function (i, node) {
              return 8;
            },
          },
          table: {
            widths: ["30%", "*"],
            body: [
              // Header Row
              [
                { text: "CLIENT INFORMATION", colSpan: 2, style: "tableHeader" },
                {},
              ],
              // Data Rows
              [
                { text: "Company Name", style: "tableValue" },
                { text: `: ${company_name}`, style: "tableKey" },
              ],
              [
                { text: "Attention", style: "tableValue" },
                { text: `: ${contact_name} ${contact_phone}`, style: "tableKey" },
              ],
              [
                { text: "Project Name", style: "tableValue" },
                { text: `: ${company_name} WO#${work_order_details?.WorkOrder}`, style: "tableKey" },
              ],
              [
                { text: "Address", style: "tableValue" },
                { text: `: ${address_name}`, style: "tableKey" },
              ]
            ],
          },
          margin: [0, 0, 0, 5],
        }
      ]
    },
    {
      text: "We are pleased to submit our proposal for the referenced project electrical work to be done in accordance with the Current National Electric Code and the codes of the local jurisdiction.",
      style: {
        fontSize: 8,
        color: "gray"
      },
      margin: [10, 5, 10, 10]
    },
    {
      columns: [
        {
          layout: {
            hLineWidth: function (i, node) {
              return i === 0 ? 1 : 0;
            },
            vLineWidth: function (i, node) {
              return i === 0 || i === node.table.widths.length ? 0 : 0;
            },
            hLineColor: function (i, node) {
              return i === 0
                ? "#000000"
                : "#CCCCCC";
            },
            vLineColor: function (i, node) {
              return "#000000";
            },
            paddingLeft: function (i, node) {
              return 5;
            },
            paddingRight: function (i, node) {
              return 5;
            },
            paddingTop: function (i, node) {
              return 5;
            },
            paddingBottom: function (i, node) {
              return 5;
            },
          },
          table: {
            widths: ["30%", "*"],
            body: [
              // Header Row
              [
                { text: "SCOPE OF WORK", colSpan: 2, style: "tableHeader" },
                {},
              ],
              // Data Rows
              [
                {
                  stack: [
                    {
                      ul: scope_work
                    }
                  ], colSpan: 2, style: "tableKey", margin: [10, 0, 0, 0]
                },
                {}
              ]
            ],
          },
          margin: [0, 0, 0, 10],
        }
      ]
    },
    {
      columns: [
        {
          layout: {
            hLineWidth: function (i, node) {
              return i === 0 || i === node.table.body.length ? 1 : 0.5;
            },
            vLineWidth: function (i, node) {
              return i === 0 || i === node.table.widths.length ? 0 : 0;
            },
            hLineColor: function (i, node) {
              return i === 0 || i === node.table.body.length
                ? "#fff"
                : "#CCCCCC";
            },
            vLineColor: function (i, node) {
              return "#000000";
            },
            paddingLeft: function (i, node) {
              return 5;
            },
            paddingRight: function (i, node) {
              return 5;
            },
            paddingTop: function (i, node) {
              return 3;
            },
            paddingBottom: function (i, node) {
              return 3;
            },
          },
          table: {
            widths: ["30%","38%","32%"],
            body: [
              // Header Row
              [
                { text: "EXCLUSIONS", colSpan: 3, style: "exclusionHeader" },
                {},
                {},
              ],
              // Data Rows
              [
                { text: "Third party inspection fees", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Low voltage/control devices and wiring", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Asbestos/lead paint abatement", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
              ],
              [
                { text: "Overtime or after-hours work", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Excavating, backfilling, and resurfacing", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Fireproofing", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
              ],
              [
                { text: "Wage scale", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Utility company fees", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Access doors", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
              ],
              [
                { text: "Bonds", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Engineered drawing/stamp fees", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Core drilling or scanning", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
              ],
              [
                { text: "Patching, painting or caulking", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Phasing and additional mobilization", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Arc-fault circuit breakers if required", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
              ],
              [
                { text: "Fire alarm work", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Electrical permit", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                {},
              ],
            ],
          },
          margin: [0, 0, 0, 10],
        }
      ]
    },
    {
      columns: [
        {
          layout: {
            hLineWidth: function (i, node) {
              return i === 0 || i === node.table.body.length ? 1 : 0.5;
            },
            vLineWidth: function (i, node) {
              return i === 0 || i === node.table.widths.length ? 0 : 0;
            },
            hLineColor: function (i, node) {
              return i === 0 || i === node.table.body.length
                ? "#fff"
                : "#fff";
            },
            vLineColor: function (i, node) {
              return "#000000";
            },
            paddingLeft: function (i, node) {
              return 5;
            },
            paddingRight: function (i, node) {
              return 5;
            },
            paddingTop: function (i, node) {
              return i === 0 ? 3 : 1;
            },
            paddingBottom: function (i, node) {
              return i === 0 ? 3 : 1;
            },
          },
          table: {
            widths: ["4%","96%"],
            body: [
              // Header Row
              [
                { text: "CLARIFICATIONS", colSpan: 2, style: "exclusionHeader" },
                []
              ],
              // Data Rows
              [
                { text: "1.", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Any electrical work in addition to the above stated scope of work or the repair of any existing code deficiencies that are required by the inspector or governing body will be billed on a time and material basis at the labor rate of $140.00 per hour per electrician and $70.00 per hour per helper.", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
              ],
              [
                { text: "2.", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "This proposal is based on all work being performed during normal working hours of 7:30 am to 4:00 pm, Monday through Friday, except holidays.", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
              ],
              [
                { text: "3.", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Hawkins Electric is not responsible for any delays caused by the inspections.", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
              ],

              [
                { text: "4.", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Exhaust fan units to be provided, installed, and vented by others.", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
              ],
              [
                { text: "5.", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
                { text: "Hawkins Electric is not responsible for any damage due to unmarked or mismarked underground utility lines by Miss Utility or the owner’s representative.", style: { fontSize: 8, color: "gray" }, margin: [10,0,0,0]},
              ]
            ],
          },
          margin: [0, 0, 0, 10],
        }
      ]
    },
    {
      text: [ `Total for the above scope of work: ------------------------ `,
        { text: `$${final_price.toFixed(2)}`, bold: true, fontSize: 14, color: "red" },
        ` ------------------------`
      ],
      margin: [0, 10, 0, 0],
      style: {
        alignment: 'center',
      }
    },
    {
      text: `(${final_price_word})`,
      margin: [0, 0, 0, 10],
      style: {
        alignment: 'center',
        italics: true,
        fontSize: 10,
      }
    },
    {
      text: "This proposal is valid for 10 calendar days, after which it is subject to revision or withdrawal. Payable as work progresses, with no retention. Invoices will be due and payable within 30 days of the submission. Past due invoices are subject to late charges at the rate of 2% per month, plus attorney fees and court costs, if necessary, for collection.",
      style: {
        fontSize: 8,
        color: "gray"
      },
      margin: [10, 0, 10, 10]
    },
    {
      columns: [
        {
          layout: {
            hLineWidth: function (i, node) {
              return i === 0 || i === node.table.body.length ? 1 : 0.5;
            },
            vLineWidth: function (i, node) {
              return i === 0 || i === node.table.widths.length ? 0 : 0;
            },
            hLineColor: function (i, node) {
              return i === 0 || i === node.table.body.length
                ? "#fff"
                : "#fff";
            },
            vLineColor: function (i, node) {
              return "#000000";
            },
            paddingLeft: function (i, node) {
              return 5;
            },
            paddingRight: function (i, node) {
              return 5;
            },
            paddingTop: function (i, node) {
              return i === 0 ? 3 : 8;
            },
            paddingBottom: function (i, node) {
              return i === 0 ? 3 : 8;
            },
          },
          table: {
            widths: ["50%","50%"],
            body: [
              // Header Row
              [
                { text: "ACCEPTED:", style: "exclusionHeader" },
                { text: "Respectfully submitted by,", style: "exclusionHeader" },
              ],
              // Data Rows
              [
                { 
                  stack: [
                    { text: "Date: ________________________" },
                    { text: "_", style: { color: "#fff" }},
                    { text: "By: __________________________" },
                  ],
                },
                {
                  stack: [
                    { text: "Hawkins Electric Service, Inc." },
                    { text: "Scott Stauffer" },
                    { text: "Commercial Service Manager" },
                  ],
                },
              ]
            ],
          },
          style: "tableValue",
          margin: [0, 0, 0, 10],
        }
      ]
    },
  ];

  const docDefinition = {
    header: {
      style: {
        alignment: 'center',
        fontSize: 10,
        color: "#333333",
      },
      stack: [
        {
          width: 220,
          image: exportBase64Logo(),
          margin: [0, 10, 0, 10],
          style: {
            alignment: 'center',
          }
        },
        { text: "8667 Cherry Lane, Laurel, Maryland 20707" },
        { text: "301-210-0900 Main Phone" },
        { text: "www.hawkinselectric.com",
          link: "www.hawkinselectric.com",
          style: "linkText"
        }
      ],
    },
    footer: {
      margin: [0, 10, 0, 10],
      style: {
        alignment: 'center',
        fontSize: 8,
        color: "#1434A4",
      },
      stack: [
        { text: "Hawkins Electric Service Inc.- West Ocean City" },
        { text: "9917 Stephen Decatur Hwy Unit 6, Ocean City, MD 21842" }
      ],
    },
    content,
    pageBreakBefore: function(currentNode, followingNodesOnPage, nodesOnNextPage, previousNodesOnPage) {
      if (currentNode.pageNumbers[0] === 1) {
        if (currentNode.text && currentNode.text.includes('withdrawal')) {
          return true; // Add a page break before the acceptance section
        }
      }

      return false; // Always add a page break before the acceptance section
    },
    pageMargins: [40, 160, 40, 40],
    styles: {
      linkText: { // New style for links
        color: 'blue',
        decoration: 'underline'
      },
      header: {
        fontSize: 24,
        bold: true,
        color: "#333333",
        margin: [0, 0, 0, 5],
      },
      subHeader: {
        fontSize: 14,
        bold: false,
        color: "#555555",
        margin: [0, 0, 0, 10],
      },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        color: "#000000",
        margin: [0, 0, 0, 5],
        decoration: "underline",
      },
      bodyText: {
        fontSize: 10,
        color: "#333333",
        margin: [0, 0, 0, 2],
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        fillColor: "#EEEEEE",
        alignment: "left",
        margin: [0, 0, 0, 0], // Reset margin for table cells
      },
      exclusionHeader: {
        color: "#555555",
        fontSize: 8,
        bold: true,
        fillColor: "#EEEEEE",
        alignment: "left",
        margin: [0, 0, 0, 0], // Reset margin for table cells
      },
      tableKey: {
        fontSize: 10,
        bold: true,
        color: "#333333",
      },
      tableValue: {
        fontSize: 10,
        color: "#333333",
      },
    },
    defaultStyle: {
      font: "Roboto", // Ensure Roboto is available or specify custom fonts in nuxt.config.ts
    },
  };

  pdfMake.vfs = pdfFonts.vfs;
  // Generate the PDF
  const pdfDoc = pdfMake.createPdf(docDefinition)
  // console.log('pdfDoc ', pdfDoc)
  // console.log('pdfDoc.value ', pdfDoc.value)
  return pdfDoc

  // You can open, download, or get a data URL
  // To open in a new tab:
  // pdfDoc.open();

  // To download directly:
  // pdfDoc.download("sample-document.pdf");

  // To get a data URL for embedding (client-side only):
//   pdfDoc.value.getDataUrl((dataUrl) => {
//     pdfLink.value = dataUrl;
//   });
}
